///<reference types="jest"/>
import {ProjMaker, ProjMakerError} from "../proj-maker"
import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import { AbsPath } from "../path_helper";

let sandbox_path = new AbsPath(__dirname).add('_sandbox')
let templates_path = sandbox_path.add('_templates')
let generator_path = templates_path.add('basic').add('new')
let output_path = sandbox_path.add('_output')

let templates =  {
    'file1.ejs.t' : '---\nto: file1\n---\nthis is file1',
    'file2.ejs.t' : '---\nto: file2\n---\nthis is file2'
}

function prepareSandbox() {
    if ( sandbox_path.isDir ) {
        sandbox_path.rmrfdir(/__tests__\/_sandbox/, false)
    } else {
        sandbox_path.mkdirs()
    }

    templates_path.mkdirs()
    output_path.add('empty').mkdirs()

    for(let fname in templates ) {
        generator_path.add(fname).saveStrSync(templates[fname])
    }
    expect(templates_path.add('basic/new/file1.ejs.t').exists).toBeTruthy()
}

beforeEach(async () => {
    process.env['HYGEN_TMPLS'] = templates_path.toString()
    prepareSandbox()    
    process.chdir(output_path.toString())
})
  
afterEach(async () => {
})

describe('new unit', () => {
    beforeEach(() => {
        expect(generator_path.isDir).toBeTruthy()
    })

    test('creates ', async () => {
        let pm = new ProjMaker
        process.chdir(output_path.add('empty').toString())
        await pm.new_unit('basic','empty')
        expect(output_path.add('empty').add('file1').isFile).toBeTruthy()
    })
})