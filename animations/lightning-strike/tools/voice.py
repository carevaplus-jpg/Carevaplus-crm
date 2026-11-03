import subprocess,re,os
os.chdir(os.environ['V'])
html=open('/home/user/Carevaplus-crm/animations/lightning-strike/index.html').read()
lines=re.findall(r'\[([\d.]+),([\d.]+),"([^"]+)"\]',html)
filters=[];inputs=[]
for i,(a,b,txt) in enumerate(lines):
    a=float(a);b=float(b)
    spoken=txt.replace('300 million','three hundred million').replace('90%','ninety percent')
    subprocess.run(['espeak-ng','-v','mb-us2','-s','172','-p','38','-w',f'l{i}.wav',spoken],check=True)
    d=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'l{i}.wav']))
    tempo=max(1.0,d/(b-a+0.25)); print(i,round(d,2),round(tempo,2))
    inputs+=['-i',f'l{i}.wav']
    filters.append(f'[{i}:a]aresample=44100,atempo={min(tempo,1.6):.3f},adelay={int(a*1000)}|{int(a*1000)}[v{i}]')
mix=''.join(f'[v{i}]' for i in range(len(lines)))+f'amix=inputs={len(lines)}:normalize=0,apad,atrim=0:30,highpass=f=90,lowpass=f=7500,acompressor=threshold=-18dB:ratio=3,volume=1.4[out]'
subprocess.run(['ffmpeg','-y','-v','error',*inputs,'-filter_complex',';'.join(filters)+';'+mix,'-map','[out]','-ac','1','voice.wav'],check=True)
subprocess.run(['ffmpeg','-y','-v','error','-i','voice.wav','-b:a','40k','-ac','1','-ar','22050','voice.mp3'],check=True)
