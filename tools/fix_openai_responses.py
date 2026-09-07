from pathlib import Path
p=Path('src/app-source.jsx')
s=p.read_text()
start=s.find('  openai:{')
end=s.find('  anthropic:{', start)
if start<0 or end<0:
    raise SystemExit('provider block not found')
new='''  openai:{
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
  },
'''
s=s[:start]+new+s[end:]
p.write_text(s)

cfg=Path('config.js')
t=cfg.read_text()
if 'REASONING_EFFORT: "low"' in t:
    t=t.replace('REASONING_EFFORT: "low"','REASONING_EFFORT: "none"',1)
elif 'REASONING_EFFORT: "none"' not in t:
    raise SystemExit('unexpected reasoning effort config')
cfg.write_text(t)
print('OpenAI Responses API patch applied')
