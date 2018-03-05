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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci50c3QtZGlzYWJsZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcHJvai1tYWtlci50c3QtZGlzYWJsZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw4Q0FBdUQ7QUFDdkQsa0NBQWlDO0FBQ2pDLHlCQUF3QjtBQUN4QixnREFBeUM7QUFFekMscURBQTZDO0FBRTdDLElBQUksS0FBSyxHQUFHLElBQUksNkJBQVksQ0FBQztJQUN6QixhQUFhLEVBQUcsRUFBRTtJQUNsQixRQUFRLEVBQUcsRUFBRTtJQUNiLGdCQUFnQixFQUFHLEVBQUU7SUFDckIsZ0JBQWdCLEVBQUcsRUFBRTtJQUNyQixPQUFPLEVBQUc7UUFDTixPQUFPLEVBQUcsZ0JBQWdCO1FBQzFCLGVBQWUsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBQ3BELFNBQVMsRUFBRztZQUNSLFVBQVUsRUFBRSx5QkFBeUI7U0FDeEM7S0FDSjtDQUNKLENBQUMsQ0FBQTtBQUVGLElBQUksY0FBYyxHQUFHLElBQUkscUJBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDN0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxxQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUVwRCxJQUFJLFNBQVMsR0FBSTtJQUNiLGFBQWEsRUFBRyxvQ0FBb0M7SUFDcEQsYUFBYSxFQUFHLG9DQUFvQztDQUN2RCxDQUFBO0FBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFBO0FBQzFFLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFB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