///<reference types="jest"/>
import {ProjMaker, ProjMakerError} from "../proj-maker"
import * as mockfs from 'mock-fs'
import * as fs from 'fs'
import * as os from 'os'
import { AbsPath } from "../path_helper";
import { GitLogic, GitLogicError } from "../git_logic";


let sandbox_path = new AbsPath(os.tmpdir()).add('_sandbox')
let templates_path = sandbox_path.add('_templates')
let generator_path = templates_path.add('basic').add('new')
let output_path = sandbox_path.add('_output')
let tmp_path = new AbsPath(os.tmpdir()).add('proj-maker-test')
let orig_cwd = process.cwd()


let templates =  {
    'file1.ejs.t' : '---\nto: file1\n---\nthis is file1 in <%= name %>',
    'file2.ejs.t' : '---\nto: file2\n---\nthis is file2'
}

function deleteSandbox() {
    if ( sandbox_path.isDir ) {
        sandbox_path.rmrfdir(/_sandbox/, false)
    }
}

function prepareSandbox() {
    // expect(1).toEqual(2)

    // clean the sandbox dir
    if ( sandbox_path.isDir ) {
        sandbox_path.rmrfdir(/_sandbox/, false)
    } else {
        sandbox_path.mkdirs()
    }
    
    //-------------------------------------
    // prepare the project dirs:
    // <sandbox>/_output/empty - an empty directory
    // <sandbox>/_output/proj1 - a directory with a git repo and a single commit in it
    //-------------------------------------
    output_path.add('empty').mkdirs()

    let proj1 = output_path.add('proj1')
    proj1.mkdirs()
    proj1.add('a-file').saveStrSync('test')
    
    // initialize a git repository in the proj1 dir
    let git = new GitLogic(proj1.parent)
    expect(()=>{git.init()}).not.toThrow()
    expect(()=>{git.add('proj1/a-file')}).not.toThrow()
    expect(()=>{git.commit('added a-file')}).not.toThrow()
    expect(proj1.parent.add('.git').isDir).toBeTruthy()

    try {
        git.add('no-such-file')
    } catch(e) {
        expect(e).toBeInstanceOf(GitLogicError.AddFailed)
        console.log("message when attempting to add non-existent file:\n",e.message)
    }

    // prepare the templates
    templates_path.mkdirs()
    for(let fname in templates ) {
        generator_path.add(fname).saveStrSync(templates[fname])
    }
    expect(templates_path.add('basic/new/file1.ejs.t').exists).toBeTruthy()
}

beforeEach(() => {
    process.env['HYGEN_TMPLS'] = templates_path.toString()
    prepareSandbox()    
    process.chdir(output_path.toString())
})
  
afterEach(() => {
    process.chdir(orig_cwd)
    deleteSandbox()
})

describe('git verification', () => {

    test('can identify whether in git repo', async () => {       
        // prepare temp directory outside of the main git repo
        let tmp_proj = tmp_path.add('tmp-project-for-unit-tests')
        if ( tmp_proj.isDir ) {
            tmp_proj.rmrfdir(/tmp-project-for-unit-tests/, false)
        } else {
            tmp_proj.mkdirs()
        }    
        expect(tmp_proj.isDir).toBeTruthy()
        console.log("tmp_proj path:", tmp_proj.abspath)

        // recognize that it's not a git repo
        let git = new GitLogic()
        git.project_dir = tmp_proj
        expect(git.is_repo).toBeFalsy()
        expect(git.project_dir.abspath).toEqual(tmp_proj.abspath)

        // see that ProjMaker refuses to create projec there
        let pm = new ProjMaker
        process.chdir(tmp_proj.abspath)
        let did_throw = null
        try {
            await pm.new_unit('basic', 'tmp-project-for-unit-tests')
        } catch ( e ) {
            did_throw = e
        }
        expect(did_throw).toBeInstanceOf(ProjMakerError.NotInGitRepo)

        // turn into a git repo
        expect(() => {git.init()}).not.toThrow()

        // recognize that it's a git repo
        expect(git.is_repo).toBeTruthy()

        // cleanup
        tmp_proj.rmrfdir(/tmp-project-for-unit-tests/, true)
    })
})

describe('new unit', () => {
    beforeEach(() => {
        expect(generator_path.isDir).toBeTruthy()
    })

    test('creates new_unit', async () => {
        //-------------------------------------------------------------------------------------------
        // in this test we use ProjMaker to create <out>/proj1/new_unit using the 'basic' generator
        // we expect a new commit with the contents as well as a tag
        //-------------------------------------------------------------------------------------------
        let pm = new ProjMaker
        let projdir = output_path.add('proj1')
        let unitdir = projdir.add('new_unit')
        unitdir.mkdirs()
        process.chdir(unitdir.toString())
        
        // create a file that should not be included in the commit
        projdir.add('extrafile').saveStrSync("this file should not be in the commit")
        expect(projdir.add('extrafile').isFile).toBeTruthy()

        // remember how many commit and tags were before creating the new unit
        let git = new GitLogic(projdir)
        expect(git.is_repo).toBeTruthy()
        let orig_commit_count = git.commit_count
        let orig_tags = git.get_tags_matching("pmAFTER_ADDING*")

        // add the extra file (later we expect it not to show up in the commit)
        git.add(projdir.add('extrafile').abspath)

        // execute unit creation
        await pm.new_unit('basic','new_unit')

        // verify that the expected files were created
        let file1 = unitdir.add('file1')
        expect(file1.isFile).toBeTruthy()
        expect(file1.contentsLines[0]).toEqual("this is file1 in new_unit")
        expect(unitdir.add('file2').isFile).toBeTruthy()
        
        // make sure a commit was performed
        expect(git.commit_count).toEqual(orig_commit_count+1)

        // make sure we have a new tag
        let tags = git.get_tags_matching("pmAFTER_ADDING*")
        expect(tags.length).toEqual(orig_tags.length + 1)
        expect(tags[0]).toEqual('pmAFTER_ADDING_new_unit')

        // ensure only the two new files were included in the commit
        let files_in_commit = git.get_files_in_commit(tags[0])
        expect(files_in_commit).toHaveLength(2)
        expect(files_in_commit[0]).toMatch(/file1/)
        expect(files_in_commit[1]).toMatch(/file2/)

        // ensure extrafile is back
        expect(projdir.add('extrafile').isFile).toBeTruthy()

    })
})