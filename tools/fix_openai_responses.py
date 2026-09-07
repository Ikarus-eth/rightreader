from pathlib import Path
p=Path('src/app-source.jsx')
s=p.read_text()

def repl(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s=s.replace(old,new,1)

repl(
'''  openai:{
    url:"https://api.openai.com/v1/chat/completions",
    modelsUrl:"https://api.openai.com/v1/models",
    keyHint:"sk-…",
    headers:k=>({"content-type":"application/json","authorization":"Bearer "+k}),
    body:(model,prompt,maxTokens,drop)=>{
      const b={model,messages:[{role:"user",content:prompt}]};
      /* Newer OpenAI models renamed max_tokens and reject the old name,
         and reasoning models bill hidden thinking tokens against the same
         budget, so a tight limit can come back with empty content. Both
         are handled by the parameter fallback below rather than by
         guessing which family a model belongs to. */
      if(!drop.has("max_completion_tokens")) b.max_completion_tokens=maxTokens;
      else b.max_tokens=maxTokens;
      if(!drop.has("response_format")) b.response_format={type:"json_object"};
      if(CFG.REASONING_EFFORT&&!drop.has("reasoning_effort")) b.reasoning_effort=CFG.REASONING_EFFORT;
      return b;
    },
    text:d=>((d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||""),
    usage:d=>({in:(d.usage||{}).prompt_tokens||0,out:(d.usage||{}).completion_tokens||0}),
    models:d=>(d.data||[]).map(m=>m.id)
  },''',
'''  openai:{
    url:"https://api.openai.com/v1/responses",
    modelsUrl:"https://api.openai.com/v1/models",
    keyHint:"sk-…",
    headers:k=>({"content-type":"application/json","authorization":"Bearer "+k}),
    body:(model,prompt,maxTokens)=>({
      model,
      input:prompt,
      max_output_tokens:maxTokens,
      text:{format:{type:"json_object"}},
      reasoning:{effort:CFG.REASONING_EFFORT||"none"},
      store:false
    }),
    text:d=>(d.output||[]).flatMap(x=>x.content||[])
      .filter(x=>x.type==="output_text").map(x=>x.text||"").join(""),
    usage:d=>({in:(d.usage||{}).input_tokens||0,out:(d.usage||{}).output_tokens||0}),
    models:d=>(d.data||[]).map(m=>m.id)
  },''',
'OpenAI Responses adapter')

repl(
'''/* Parameters the API told us it does not accept for this model, learned
   once and remembered, so a wrong guess costs one rejected call ever
   rather than one on every lookup. */
function droppedParams(){ return new Set(lsGet("drop",[])); }
function dropParam(name){
  const d=droppedParams(); if(d.has(name)) return false;
  d.add(name); lsSet("drop",[...d]); return true;
}
''',
'''/* The OpenAI path uses the current Responses API shape directly. */
function droppedParams(){ return new Set(); }
''',
'remove legacy parameter memory')

repl(
'''      body:JSON.stringify(P.body(model,prompt,maxTokens,droppedParams()))});''',
'''      body:JSON.stringify(P.body(model,prompt,maxTokens,droppedParams()))});''',
'body call unchanged')

repl(
'''    /* A 400 naming a parameter means this model does not take it. Drop it
       for good and try once more instead of failing the lookup. */
    if(res.status===400){
      const m=/max_completion_tokens|max_tokens|response_format|reasoning_effort/.exec(msg);
      if(m&&dropParam(m[0]==="max_tokens"?"max_completion_tokens":m[0]))
        return rawCall(model,prompt,maxTokens,timeoutMs,key);
    }
    throw new Error("HTTP "+res.status+": "+msg);''',
'''    throw new Error("HTTP "+res.status+": "+msg);''',
'remove legacy fallback')

p.write_text(s)

cfg=Path('config.js')
t=cfg.read_text()
t=t.replace('REASONING_EFFORT: "low"','REASONING_EFFORT: "none"')
cfg.write_text(t)
print('OpenAI Responses API patch applied')
