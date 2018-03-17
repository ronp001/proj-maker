///<reference types="jest"/>
import {ProjMaker, ProjMakerError} from "../proj-maker"
import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import { AbsPath } from "../path_helper";

import {MockFSHelper} from "./mock-fs-helper"
import { HygenRunner } from "../hygen_runner";


let simfs = new MockFSHelper({
    '/_templates/basic/new' : {
        'file1.ejs.t' : '---\nto: file1\n---\nthis is file1',
        'file2.ejs.t' : '---\nto: file2\n---\nthis is file2'
    },
    '/empty' : {},
    '/basedir/unit1' : {},
    '/basedir/unit2' : {},
    '/dir1' : {
        'file1' : 'a file in dir1',
        'link_to_file1': mockfs.symlink({ path: './file1' }),
        'subdir1' : {
            'somefile': 'a file in /dir1/subdir1'
        }
    }
})


// copy required modules so that exceptions are displayed properly by jest
simfs.addFile(new AbsPath(__dirname).add("../proj-maker.test.ts"))
simfs.addFile(new AbsPath(__dirname).add("../proj-maker.ts"))
simfs.addDirContents(new AbsPath(__dirname).add("../../node_modules/callsites"))




beforeEach(async () => {    
    mockfs(simfs.fs_structure)
    expect(new AbsPath('/_templates/basic/new/file1.ejs.t').exists).toBeTruthy()
    process.env['HYGEN_TMPLS'] = new AbsPath('/_templates').toString()
})
  
afterEach(async () => {
    mockfs.restore()
})


test('construction', () => {
    let proj_maker = new ProjMaker();
    expect(proj_maker).toBeInstanceOf(ProjMaker)
});

describe('directory for new unit', () => {
    test('current dir does not match unit name', () => {
        process.chdir('/empty')
        let pm = new ProjMaker
        expect(pm.getDirForNewUnit('proj1').toString()).toEqual('/empty/proj1')
    })
    test('current dir does match unit name', () => {
        process.chdir('/empty')
        let pm = new ProjMaker
        expect(pm.getDirForNewUnit('empty').toString()).toEqual('/empty')
        expect(pm.getDirForNewUnit('Empty').toString()).toEqual('/empty')
        
        fs.mkdirSync('/empty/project-one')
        expect(pm.getDirForNewUnit('ProjectOne').toString()).toEqual('/empty/ProjectOne')

        process.chdir('/empty/project-one')
        expect(pm.getDirForNewUnit('ProjectOne').toString()).toEqual('/empty/project-one')
        expect(pm.getDirForNewUnit('project_one').toString()).toEqual('/empty/project-one')
    })
})


describe('new unit', async () => {
    beforeEach(() => {
        expect(new AbsPath('/_templates/basic/new').exists).toBeTruthy()
    })

    test('refuses to create in non-empty directory', async () => {
        let pm = new ProjMaker
        expect(pm.getDirForGenerator('basic').toString()).toEqual('/_templates/basic/new')
        
        process.chdir('/dir1')
        await expect(pm.new_unit('basic','dir1')).rejects.toThrow(/not empty/i)
    })

    test('throws error if no generator', async () => {
        let pm = new ProjMaker
        process.chdir('/empty')
        
        await expect(pm.new_unit('t1','my-unit')).rejects.toThrow(/generator/i)
    })

    test('creates directory if necessary', () => {
        let pm = new ProjMaker
        process.chdir('/empty')
        
        pm.runHygen = jest.fn()

        pm.new_unit('basic','my-unit')
        let outdir = new AbsPath('/empty/my-unit')
        expect(outdir.isDir).toBeTruthy()

        let mockedfn : jest.Mock<any> = (pm.runHygen as any)
        expect(mockedfn.mock.calls.length).toEqual(1)
    })

    test('does not create directory if unnecessary', () => {
        let pm = new ProjMaker
        pm.runHygen = jest.fn()

        process.chdir('/empty')
        
        pm.new_unit('basic','empty')
        expect(new AbsPath('/empty/empty').isDir).toBeFalsy()

        let mockedfn : jest.Mock<any> = (pm.runHygen as any)
        expect(mockedfn.mock.calls.length).toEqual(1)
    })

})