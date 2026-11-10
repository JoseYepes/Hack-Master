#!/usr/bin/env python3
"""Genera data.js a partir de los CSV exportados del Excel (una pestaña por CSV).
Uso: python3 build_data.py Habilidades.csv Conjuntos.csv Dudas.csv Descripciones.csv > data.js
(Exporta cada pestaña a CSV UTF-8 desde Excel/LibreOffice.)"""
import csv, json, sys
hab, con, dud = sys.argv[1:4]
des = sys.argv[4] if len(sys.argv)>4 else None
def num(x):
    x=(x or '').strip()
    try: return int(x)
    except: 
        try: return float(x)
        except: return x
H=list(csv.reader(open(hab,encoding='utf-8')))[1:]
skills=[dict(n=r[0],tipo=r[1],pc=num(r[2]),car=r[3],die=(r[4].lower().replace('d','') if r[4].lower()!='na' else 'NA'),req=r[5],precio=num(r[6]),dif=num(r[7]),libro=r[8],clases=r[9]) for r in H if r[0].strip()]
C=list(csv.reader(open(con,encoding='utf-8')))
mine=[];oficiales=[];estilos=[];i=0;mode='mine'
while i<len(C):
    r=C[i]+['']*12; b=r[1].strip()
    if b.startswith('Conjuntos de habilidades oficiales'): mode='of'; i+=1; continue
    if b=='Estilos de combate': mode='st'; i+=1; continue
    if i+1<len(C) and C[i+1][1:3]==['Habilidad','PC'] and b: mode='mine'
    if mode in('of','st'):
        if b and b!='Habilidad':
            row=dict(n=b,pc=num(r[3]),car=r[4],die=r[5],req=r[6],precio=num(r[7]),dif=num(r[8]),libro=r[9],clases=r[10])
            (oficiales if mode=='of' else estilos).append(row)
        i+=1; continue
    # conjuntos propios: fila resumen + cabecera + componentes
    if b and b!='Habilidad' and i+1<len(C) and C[i+1][1:2]==['Habilidad']:
        comp=[];k=i+2
        while k<len(C) and C[k][1:2] and C[k][1].strip(): comp.append(C[k][1].strip()); k+=1
        mine.append(dict(n=b,pc=num(r[2]),car=r[3],die=r[4],precio=num(r[6]),dif=num(r[7]),libro=r[8],clases=r[9],comp=comp))
        i=k; continue
    i+=1
D=[dict(n=r[0],fuente=r[1],duda=r[2],hecho=r[3]) for r in list(csv.reader(open(dud,encoding='utf-8')))[1:] if r and r[0]]
DESC=[dict(n=r[0],libro=r[1],d=r[2],t=r[3] if len(r)>3 else '') for r in list(csv.reader(open(des,encoding='utf-8')))[1:] if r and r[0]] if des else []
print('window.DATA='+json.dumps(dict(descripciones=DESC,skills=skills,conjuntos=mine,oficiales=oficiales,estilos=estilos,dudas=D),ensure_ascii=False)+';')
