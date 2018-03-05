"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
///<reference types="jest"/>
const proj_maker_1 = require("../proj-maker");
const mockfs = require("mock-fs");
const fs = require("fs");
const path_helper_1 = require("../path_helper");
const mock_fs_helper_1 = require("./mock-fs-helper");
let simfs = new mock_fs_helper_1.MockFSHelper({
    '/_templates': {},
    '/empty': {},
    '/basedir/unit1': {},
    '/basedir/unit2': {},
    '/dir1': {
        'file1': 'a file in dir1',
        'link_to_file1': mockfs.symlink({ path: './file1' }),
        'subdir1': {
            'somefile': 'a file in /dir1/subdir1'
        }
    }
});
let templates_path = new path_helper_1.AbsPath(__dirname).add('_templates');
let out_path = new path_helper_1.AbsPath(__dirname).add('_output');
let templates = {
    'file1.ejs.t': '---\nto: file1\n---\nthis is file1',
    'file2.ejs.t': '---\nto: file2\n---\nthis is file2'
};
simfs.fs_structure[templates_path.add('basic/new').toString()] = templates;
simfs.fs_structure[out_path.toString()] = {};
// Prepare path_helper.ts for inclusion in the mocked filesystem
// so that exceptions are displayed properly by jest
simfs.addFile(new path_helper_1.AbsPath(__dirname).add("../proj-maker.test.ts"));
simfs.addFile(new path_helper_1.AbsPath(__dirname).add("../proj-maker.ts"));
simfs.addDirContents(new path_helper_1.AbsPath(__dirname).add("../../node_modules/callsites"));
simfs.addDirContents(new path_helper_1.AbsPath(__dirname).add("../../node_modules/hygen"));
function clearOutDir() {
    if (out_path.isDir) {
        out_path.rmrfdir(/__tests__\/_output/, false);
    }
    else {
        out_path.mkdirs();
    }
}
beforeAll(() => {
    //----------------------------------------------------------------------------------------
    // Everything here operates on the actual filesystem - not the mocked fs!
    //----------------------------------------------------------------------------------------
    clearOutDir();
    if (templates_path.add('basic').exists) {
        templates_path.rmrfdir(/__tests__\/_templates/, false);
    }
    expect(templates_path.add('basic').exists).toBeFalsy();
    for (let fname in templates) {
        templates_path.add('basic/new').add(fname).saveStrSync(templates[fname]);
    }
    expect(templates_path.add('basic/new/file1.ejs.t').exists).toBeTruthy();
});
beforeEach(() => __awaiter(this, void 0, void 0, function* () {
    clearOutDir(); // operates on the real fs!
    mockfs(simfs.fs_structure);
    process.env['HYGEN_TMPLS'] = templates_path.toString();
    expect(templates_path.add('basic/new/file1.ejs.t').exists).toBeTruthy();
}));
afterEach(() => __awaiter(this, void 0, void 0, function* () {
    mockfs.restore();
}));
test('construction', () => {
    let proj_maker = new proj_maker_1.ProjMaker();
    expect(proj_maker).toBeInstanceOf(proj_maker_1.ProjMaker);
});
describe('directory for new unit', () => {
    test('current dir does not match unit name', () => {
        process.chdir('/empty');
        let pm = new proj_maker_1.ProjMaker;
        expect(pm.getDirForNewUnit('proj1').toString()).toEqual('/empty/proj1');
    });
    test('current dir does match unit name', () => {
        process.chdir('/empty');
        let pm = new proj_maker_1.ProjMaker;
        expect(pm.getDirForNewUnit('empty').toString()).toEqual('/empty');
        expect(pm.getDirForNewUnit('Empty').toString()).toEqual('/empty');
        fs.mkdirSync('/empty/project-one');
        expect(pm.getDirForNewUnit('ProjectOne').toString()).toEqual('/empty/ProjectOne');
        process.chdir('/empty/project-one');
        expect(pm.getDirForNewUnit('ProjectOne').toString()).toEqual('/empty/project-one');
        expect(pm.getDirForNewUnit('project_one').toString()).toEqual('/empty/project-one');
    });
});
describe('new unit', () => {
    beforeEach(() => {
        expect(templates_path.add('basic/new').exists).toBeTruthy();
    });
    test('refuses to create in non-empty directory', () => __awaiter(this, void 0, void 0, function* () {
        let pm = new proj_maker_1.ProjMaker;
        expect(pm.getDirForGenerator('basic').toString()).toEqual(templates_path.add('basic/new').toString());
        process.chdir('/dir1');
        expect(() => { pm.new_unit('basic', 'dir1'); }).toThrow(/not empty/i);
    }));
    test('throws error if no generator', () => {
        let pm = new proj_maker_1.ProjMaker;
        process.chdir('/empty');
        expect(() => { pm.new_unit('t1', 'my-unit'); }).toThrow(/generator/i);
    });
    test.only('creates directory if necessary', () => {
        let pm = new proj_maker_1.ProjMaker;
        process.chdir(out_path.toString());
        pm.new_unit('basic', 'my-unit');
        let outdir = new path_helper_1.AbsPath('/empty/my-unit');
        expect(outdir.isDir).toBeTruthy();
        expect(outdir.add('file1').isFile).toBeTruthy();
    });
    test('does not create directory if unnecessary', () => {
        let pm = new proj_maker_1.ProjMaker;
        process.chdir('/empty');
        pm.new_unit('basic', 'empty');
        expect(new path_helper_1.AbsPath('/empty/empty').isDir).toBeFalsy();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Byb2otbWFrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsNEJBQTRCO0FBQzVCLDhDQUF1RDtBQUN2RCxrQ0FBaUM7QUFDakMseUJBQXdCO0FBQ3hCLGdEQUF5QztBQUV6QyxxREFBNkM7QUFFN0MsSUFBSSxLQUFLLEdBQUcsSUFBSSw2QkFBWSxDQUFDO0lBQ3pCLGFBQWEsRUFBRyxFQUFFO0lBQ2xCLFFBQVEsRUFBRyxFQUFFO0lBQ2IsZ0JBQWdCLEVBQUcsRUFBRTtJQUNyQixnQkFBZ0IsRUFBRyxFQUFFO0lBQ3JCLE9BQU8sRUFBRztRQUNOLE9BQU8sRUFBRyxnQkFBZ0I7UUFDMUIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDcEQsU0FBUyxFQUFHO1lBQ1IsVUFBVSxFQUFFLHlCQUF5QjtTQUN4QztLQUNKO0NBQ0osQ0FBQyxDQUFBO0FBRUYsSUFBSSxjQUFjLEdBQUcsSUFBSSxxQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUM3RCxJQUFJLFFBQVEsR0FBRyxJQUFJLHFCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBRXBELElBQUksU0FBUyxHQUFJO0lBQ2IsYUFBYSxFQUFHLG9DQUFvQztJQUNwRCxhQUFhLEVBQUcsb0NBQW9DO0NBQ3ZELENBQUE7QUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUE7QUFDMUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUE7QUFFNUMsZ0VBQWdFO0FB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