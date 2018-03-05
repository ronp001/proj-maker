///<reference types="jest"/>
import {ProjMaker, ProjMakerError} from "../proj-maker"
import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import { AbsPath } from "../path_helper";

import {MockFSHelper} from "./mock-fs-helper"

let simfs = new MockFSHelper({
    '/dir1' : {
        'file1' : 'a file in dir1',
        'link_to_file1': mockfs.symlink({ path: './file1' }),
        'subdir1' : {
            'somefile': 'a file in /dir1/subdir1'
        }
    }
})

// Prepare path_helper.ts for inclusion in the mocked filesystem
// so that exceptions are displayed properly by jest
simfs.addFile(__dirname + "/../proj-maker.test.ts")


beforeEach(async () => {
    mockfs(simfs.fs_structure)
})
  
afterEach(async () => {
    mockfs.restore()
})


test('construction', () => {
    let proj_maker = new ProjMaker();
    expect(proj_maker).toBeInstanceOf(ProjMaker)
});

