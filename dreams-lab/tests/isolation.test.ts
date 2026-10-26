import {it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import provenance from '../engine-provenance.json';

const root=fileURLToPath(new URL('../',import.meta.url));
it('keeps every application source import inside the Lab or its declared packages',()=>{
  const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  const visit=(directory:string)=>{
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const path=resolve(directory,entry.name);if(entry.isDirectory()){visit(path);continue;}if(!path.endsWith('.ts'))continue;
      const file=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
      const walk=(node:ts.Node)=>{
        if(ts.isStringLiteral(node)&&((ts.isImportDeclaration(node.parent)||ts.isExportDeclaration(node.parent))&&node.parent.moduleSpecifier===node||ts.isCallExpression(node.parent)&&node.parent.expression.kind===ts.SyntaxKind.ImportKeyword)){
          const spec=node.text;if(spec.startsWith('.'))expect(relative(root,resolve(dirname(path),spec.split('?')[0]!)).startsWith('..')).toBe(false);
          else expect(Object.keys(pkg.dependencies).some(name=>spec===name||spec.startsWith(name+'/'))).toBe(true);
        }ts.forEachChild(node,walk);
      };walk(file);
    }
  };visit(resolve(root,'src'));
  expect(JSON.parse(readFileSync(resolve(root,'tsconfig.json'),'utf8')).extends).toBeUndefined();
});
it('pins the copied engine bytes to a committed source snapshot and excludes the city entry points',()=>{
  expect(provenance.revision).toMatch(/^[a-f0-9]{40}$/);
  for(const file of provenance.files){
    expect(createHash('sha256').update(readFileSync(resolve(root,'src/engine',file.path))).digest('hex')).toBe(file.sha256);
    expect(file.path).not.toMatch(/world-fixture|game\/main|world\//);
  }
});
