///<reference types="jest"/>
import {ProjMaker, ProjMakerError} from "../proj-maker"
import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import { AbsPath } from "../path_helper";
import { SimpleGitConnector } from "../simple-git-connector"


let sandbox_path = new AbsPath(__dirname).add('_sandbox')
let templates_path = sandbox_path.add('_templates')
let generator_path = templates_path.add('basic').add('new')
let output_path = sandbox_path.add('_output')


let templates =  {
    'file1.ejs.t' : '---\nto: file1\n---\nthis is file1 in <%= name %>',
    'file2.ejs.t' : '---\nto: file2\n---\nthis is file2'
}

async function prepareSandbox() {

    // clean the sandbox dir
    if ( sandbox_path.isDir ) {
        sandbox_path.rmrfdir(/__tests__\/_sandbox/, false)
    } else {
        sandbox_path.mkdirs()
    }
    
    // prepare the project dirs
    output_path.add('empty').mkdirs()
    let proj1 = output_path.add('proj1')
    proj1.mkdirs()
    proj1.add('a-file').saveStrSync('test')
    
    // initialize a git repository in the proj1 dir
    let git = SimpleGitConnector.connect(proj1.toString())
    await git.init()
    await git.add('a-file')
    await git.commit('added a-file')
    expect(proj1.add('.git').isDir).toBeTruthy()

    // prepare the templates
    templates_path.mkdirs()
    for(let fname in templates ) {
        generator_path.add(fname).saveStrSync(templates[fname])
    }
    expect(templates_path.add('basic/new/file1.ejs.t').exists).toBeTruthy()


}

beforeEach(async () => {
    process.env['HYGEN_TMPLS'] = templates_path.toString()
    await prepareSandbox()    
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
        let file1 = output_path.add('empty').add('file1')
        expect(file1.isFile).toBeTruthy()
        expect(file1.contentsLines[0]).toEqual("this is file1 in empty")
    })
})