# Assemble a MakeHuman character (CC0 data files) into a skinned GLB. No Blender needed.
import json,gzip,struct,io,os,sys,re
import numpy as np
from PIL import Image
MH=sys.argv[1]; OUT=sys.argv[2]
D=MH+'/mpfb/mpfb/data'; A=MH+'/assets'
# ---------- base mesh ----------
V=[];VT=[];F=[];FG=[];groups={};cur=None
for l in open(D+'/3dobjs/base.obj'):
    p=l.split()
    if not p: continue
    if p[0]=='v': V.append([float(x) for x in p[1:4]])
    elif p[0]=='vt': VT.append([float(x) for x in p[1:3]])
    elif p[0]=='g': cur=p[1]
    elif p[0]=='f':
        F.append([tuple(int(i)-1 for i in c.split('/')[:2]) for c in p[1:]]);FG.append(cur)
V=np.array(V);VT=np.array(VT)
def target(name,w=1.0):
    for l in gzip.open(D+'/targets/'+name+'.target.gz','rt'):
        p=l.split()
        if len(p)==4 and not l.startswith('#'): V[int(p[0])]+=w*np.array([float(p[1]),float(p[2]),float(p[3])])
target('macrodetails/universal-male-young-averagemuscle-averageweight')
target('macrodetails/caucasian-male-young')
for f,g in zip(F,FG):
    groups.setdefault(g,set()).update(c[0] for c in f)
body_idx=np.array(sorted(groups['body']))
SC=0.1; y0=V[body_idx,1].min()
def W(P): P=np.array(P,dtype=float).copy(); P[...,1]-=y0; return P*SC
# ---------- rig ----------
rig=json.load(open(D+'/rigs/standard/rig.default.json'))
def jpos(e):
    s=e['strategy']
    if s=='VERTEX': return V[e['vertex_index']]
    if s=='MEAN': return V[e['vertex_indices']].mean(0)
    if s=='CUBE': return V[sorted(groups[e['cube_name']])].mean(0)
    raise Exception(s)
order=[];
def add(n):
    if n in order: return
    if rig[n]['parent']: add(rig[n]['parent'])
    order.append(n)
for n in rig: add(n)
bidx={n:i for i,n in enumerate(order)}
heads={n:W(jpos(rig[n]['head'])) for n in order}; tails={n:W(jpos(rig[n]['tail'])) for n in order}
wj=json.load(open(D+'/rigs/standard/weights.default.json'))['weights']
NB=len(order); BW=np.zeros((len(V),NB),dtype=np.float32)
for b,lst in wj.items():
    if b in bidx:
        for vi,w in lst: BW[vi,bidx[b]]+=w
def top4(Wm):
    idx=np.argsort(-Wm,axis=1)[:,:4]; w=np.take_along_axis(Wm,idx,1); s=w.sum(1,keepdims=True); 
    w=np.where(s>1e-8,w/np.maximum(s,1e-8),np.array([[1,0,0,0]],dtype=np.float32)); idx=np.where(w>0,idx,0)
    return idx.astype(np.uint8),w.astype(np.float32)
# ---------- helpers ----------
def tri(faces):
    out=[]
    for f in faces:
        for k in range(1,len(f)-1): out.append((f[0],f[k],f[k+1]))
    return out
def build(P,faces,uv,weights):
    """P: positions (n,3); faces: list of [(vi,ti),...]; returns split-vertex arrays"""
    tris=tri(faces); key={};pos=[];uvs=[];src=[];idx=[]
    for t in tris:
        for c in t:
            if c not in key: key[c]=len(pos);pos.append(P[c[0]]);uvs.append(uv[c[1]] if c[1] is not None else (0,0));src.append(c[0])
            idx.append(key[c])
    pos=np.array(pos,dtype=np.float32);src=np.array(src);idx=np.array(idx,dtype=np.uint32).reshape(-1,3)
    N=np.zeros((len(P),3)); a=P[[t[0][0] for t in tris]];b=P[[t[1][0] for t in tris]];c=P[[t[2][0] for t in tris]]
    fn=np.cross(b-a,c-a)
    for k in range(3): np.add.at(N,[t[k][0] for t in tris],fn)
    N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-12)
    uvs=np.array(uvs,dtype=np.float32); uvs[:,1]=1-uvs[:,1]
    j,w=top4(weights[src])
    return dict(pos=pos,nrm=N[src].astype(np.float32),uv=uvs,idx=idx,j=j,w=w)
def parse_mhclo(path):
    sc={};verts=[];dele=set();mode=None;info={}
    for l in open(path,encoding='utf-8',errors='ignore'):
        l=l.strip()
        if not l or l.startswith('#'): continue
        p=l.split()
        if p[0]=='verts': mode='v';continue
        if p[0]=='delete_verts': mode='d';continue
        if re.match(r'^[a-zA-Z_]',p[0]):
            if p[0] in('x_scale','y_scale','z_scale'): sc[p[0][0]]=(int(p[1]),int(p[2]),float(p[3]))
            elif p[0] in('obj_file','material','vertexboneweights_file'): info[p[0]]=p[1]
            if p[0] not in('x_scale','y_scale','z_scale','obj_file','material','name','uuid','basemesh','tag','z_depth','max_pole','vertexboneweights_file'): mode=None
            continue
        if mode=='v': verts.append([float(x) for x in p])
        elif mode=='d':
            i=0
            while i<len(p):
                if i+2<len(p) and p[i+1]=='-': dele.update(range(int(p[i]),int(p[i+2])+1)); i+=3
                else: dele.add(int(p[i])); i+=1
    return sc,verts,dele,info
def mhmat(path):
    m={}
    for l in open(path,encoding='utf-8',errors='ignore'):
        p=l.split()
        if len(p)>=2 and not l.startswith('#'): m[p[0]]=p[1:]
    return m
def proxy(folder,name=None,matpath=None):
    name=name or os.path.basename(folder)
    sc,verts,dele,info=parse_mhclo(f'{folder}/{name}.mhclo')
    s=[abs(V[sc[a][0]][i]-V[sc[a][1]][i])/sc[a][2] for i,a in enumerate('xyz')]
    P=[];Wt=np.zeros((len(verts),NB),dtype=np.float32)
    for k,v in enumerate(verts):
        if len(v)==1: P.append(V[int(v[0])]); Wt[k]=BW[int(v[0])]
        else:
            i=[int(v[0]),int(v[1]),int(v[2])]; w=v[3:6]; d=v[6:9]
            P.append(V[i[0]]*w[0]+V[i[1]]*w[1]+V[i[2]]*w[2]+np.array([d[0]*s[0],d[1]*s[1],d[2]*s[2]]))
            Wt[k]=BW[i[0]]*w[0]+BW[i[1]]*w[1]+BW[i[2]]*w[2]
    P=np.array(P)
    ov=[];ovt=[];of=[]
    for l in open(f'{folder}/{info["obj_file"]}'):
        p=l.split()
        if not p: continue
        if p[0]=='v': ov.append(1)
        elif p[0]=='vt': ovt.append([float(x) for x in p[1:3]])
        elif p[0]=='f': of.append([(int(c.split('/')[0])-1,(int(c.split('/')[1])-1) if '/' in c and c.split('/')[1] else None) for c in p[1:]])
    assert len(ov)==len(P),(name,len(ov),len(P))
    m=build(W(P),of,np.array(ovt) if ovt else np.zeros((1,2)),Wt)
    mp=matpath or f'{folder}/{info["material"]}'; mm=mhmat(mp)
    m['mat']=mm; m['matdir']=os.path.dirname(mp); m['name']=name
    return m,dele
# ---------- pieces ----------
pieces=[];deleted=set()
for folder,kw in [(A+'/clothes/male_casualsuit06',{}),(A+'/clothes/shoes05',{}),(A+'/hair/short02',{}),
    (A+'/eyes/high-poly',{'matpath':A+'/eyes/materials/brown.mhmat'}),(A+'/eyebrows/eyebrow001',{}),(A+'/eyelashes/eyelashes01',{}),
    (A+'/teeth/teeth_base',{}),(A+'/tongue/tongue01',{})]:
    m,d=proxy(folder,**kw); pieces.append(m)
    if 'clothes' in folder: deleted|=d
bf=[f for f,g in zip(F,FG) if g=='body']
skin={'diffuseTexture':['young_lightskinned_male_diffuse.png']}
full=build(W(V),bf,VT,BW); full.update(name='body_full',mat=skin,matdir=A+'/skins/young_caucasian_male')
vis=build(W(V),[f for f in bf if not any(c[0] in deleted for c in f)],VT,BW); vis.update(name='body',mat=skin,matdir=A+'/skins/young_caucasian_male')
pieces=[vis,full]+pieces
# ---------- GLB ----------
bin_=bytearray();views=[];acc=[];images=[];textures=[];materials=[];meshes=[];nodes=[]
def view(data,target=None):
    while len(bin_)%4: bin_.append(0)
    views.append({'buffer':0,'byteOffset':len(bin_),'byteLength':len(data),**({'target':target} if target else {})});bin_.extend(data);return len(views)-1
def accessor(arr,ctype,typ,target=None,mm=False):
    v=view(arr.tobytes(),target);a={'bufferView':v,'componentType':ctype,'count':int(arr.shape[0]),'type':typ}
    if mm: a['min']=arr.min(0).tolist();a['max']=arr.max(0).tolist()
    acc.append(a);return len(acc)-1
texcache={}
def tex(path,alpha=False,maxs=2048):
    if path in texcache: return texcache[path]
    im=Image.open(path)
    if 'male_casualsuit06_diffuse' in path:  # plain tee: paint out the printed logo
        from PIL import ImageFilter
        a=np.array(im.convert('RGB')).astype(np.int16); h=int(a.shape[0]*.42)
        small=im.convert('RGB').resize((256,256),Image.BILINEAR).filter(ImageFilter.MedianFilter(31)).resize(im.size,Image.BILINEAR)
        m=np.array(small).astype(np.int16); diff=np.abs(a-m).max(2)
        mask=np.zeros(a.shape[:2],bool); mask[:h]=diff[:h]>14
        mk=Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3))
        im=Image.composite(small,im.convert('RGB'),mk)
    if max(im.size)>maxs: im=im.resize((maxs,maxs),Image.LANCZOS)
    b=io.BytesIO()
    if alpha: im.convert('RGBA').save(b,'PNG',optimize=True);mime='image/png'
    else: im.convert('RGB').save(b,'JPEG',quality=92);mime='image/jpeg'
    images.append({'bufferView':view(b.getvalue()),'mimeType':mime});textures.append({'source':len(images)-1,'sampler':0})
    texcache[path]=len(textures)-1;return texcache[path]
for m in pieces:
    mm=m['mat'];transp=mm.get('transparent',['False'])[0]=='True'
    mat={'name':m['name'],'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':.7},'doubleSided':transp or m['name'] in('male_casualsuit06',)}
    if 'diffuseTexture' in mm: mat['pbrMetallicRoughness']['baseColorTexture']={'index':tex(m['matdir']+'/'+mm['diffuseTexture'][0],alpha=transp)}
    if 'normalmapTexture' in mm and os.path.exists(m['matdir']+'/'+mm['normalmapTexture'][0]): mat['normalTexture']={'index':tex(m['matdir']+'/'+mm['normalmapTexture'][0])}
    if transp: mat['alphaMode']='BLEND'
    materials.append(mat)
    prim={'attributes':{'POSITION':accessor(m['pos'],5126,'VEC3',34962,True),'NORMAL':accessor(m['nrm'],5126,'VEC3',34962),'TEXCOORD_0':accessor(m['uv'],5126,'VEC2',34962),
          'JOINTS_0':accessor(m['j'],5121,'VEC4',34962),'WEIGHTS_0':accessor(m['w'],5126,'VEC4',34962)},'indices':accessor(m['idx'].reshape(-1),5125,'SCALAR',34963),'material':len(materials)-1}
    meshes.append({'name':m['name'],'primitives':[prim]})
# joint nodes: translation only, so every bone's local axes equal world axes
for n in order:
    par=rig[n]['parent']; t=heads[n]-(heads[par] if par else 0)
    nodes.append({'name':n,'translation':[float(x) for x in t],'children':[]})
for n in order:
    if rig[n]['parent']: nodes[bidx[rig[n]['parent']]]['children'].append(bidx[n])
for nd in nodes:
    if not nd['children']: del nd['children']
ibm=np.tile(np.eye(4,dtype=np.float32),(NB,1,1))
for n in order: ibm[bidx[n],3,:3]=-heads[n]
skin_={'joints':list(range(NB)),'inverseBindMatrices':accessor(ibm.reshape(NB,16),5126,'MAT4')}
roots=[bidx[n] for n in order if not rig[n]['parent']]
mesh_nodes=[]
for i,m in enumerate(meshes): nodes.append({'name':m['name'],'mesh':i,'skin':0});mesh_nodes.append(len(nodes)-1)
gltf={'asset':{'version':'2.0','generator':'mhbuild'},'scene':0,'scenes':[{'nodes':roots+mesh_nodes}],'nodes':nodes,'meshes':meshes,'materials':materials,
 'textures':textures,'images':images,'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'skins':[skin_],'accessors':acc,'bufferViews':views,'buffers':[{'byteLength':len(bin_)}]}
js=json.dumps(gltf,separators=(',',':')).encode()
while len(js)%4: js+=b' '
while len(bin_)%4: bin_.append(0)
with open(OUT,'wb') as f:
    f.write(struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin_)));f.write(struct.pack('<II',len(js),0x4E4F534A));f.write(js);f.write(struct.pack('<II',len(bin_),0x004E4942));f.write(bin_)
# ---------- landmarks ----------
Wv=W(V); bw=Wv[body_idx]
teeth=Wv[sorted(groups['helper-upper-teeth']|groups['helper-lower-teeth'])]
tc=teeth.mean(0); near=bw[(np.abs(bw[:,0])<.012)&(np.abs(bw[:,1]-tc[1])<.012)]
mid=bw[np.abs(bw[:,0])<.006]
lm={'height':float(bw[:,1].max()),'mouth':[0,float(tc[1]),float(near[:,2].max())],'teeth':tc.tolist(),'crotch_y':float(mid[(mid[:,1]>.5)&(mid[:,1]<1.1)][:,1].min()),
    'eyeL':Wv[sorted(groups['helper-l-eye'])].mean(0).tolist(),'bones':{n:heads[n].tolist() for n in order},'tails':{n:tails[n].tolist() for n in('head','jaw','upperarm01.L','lowerarm01.L','wrist.L','spine01')}}
json.dump(lm,open(OUT.replace('.glb','.json'),'w'))
print('ok',OUT,os.path.getsize(OUT),'height',lm['height'],'mouth',lm['mouth'],'crotch',lm['crotch_y'],[(m['name'],len(m['pos'])) for m in pieces])
s=1.7015/lm['mouth'][1]
for y in (0.92,1.0,1.1,1.2,1.3,1.4,1.5,1.6):
    sl=bw[np.abs(bw[:,1]*s-y)<.02]; c=sl[np.abs(sl[:,0])<.2*1] if y<1.42 else sl[np.abs(sl[:,0])<.1]
    print(y,'x',round(c[:,0].min()*s,3),round(c[:,0].max()*s,3),'z',round(c[:,2].min()*s,3),round(c[:,2].max()*s,3))
print('scale',s,'mouth z',lm['mouth'][2]*s)
