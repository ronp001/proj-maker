import {AbsPath} from './path_helper'
import {StrUtils} from './str_utils'
import {LOG} from './logger'
import * as _ from "lodash"
import chalk from 'chalk'
import {HygenRunner} from './hygen_runner'
import { GitConnectorSync } from './git_connector';

const APP_VERSION = "0.2.0"

export class ProjMakerError extends Error {
    constructor(public msg: string) {super(chalk.red("ERROR -- " + msg))}
    // public get message() { return chalk.red("ERROR: proj-maker - " + this.msg) }
}

export namespace ProjMakerError {
    export class BasedirNotSet extends ProjMakerError { constructor() { super("Base dir not set ($HYGEN_TMPLS)")  } }
    export class OutputDirNotFound extends ProjMakerError { constructor(outdir:string) { super("Cannot find output directory: " + outdir)  } }
    export class OutputDirNotEmpty extends ProjMakerError { constructor(outdir:string) { super("Output directory not empty: " + outdir)  } }
    export class NoGenerator extends ProjMakerError { constructor(unit_type:string) { super("Cannot find generator for unit type: " + unit_type)  } }
    export class NotInGitRepo extends ProjMakerError { constructor() { super("Must be in git repo")  } }
}

export class ProjMaker {

    // The following allows running ProjMaker in a test environment
    // without worrying about having to mock the potentially dangerous functions
    // in every instance of ProjMaker.
    // To use this: override initProjMaker with a function that creates the appropriate mocks.

    public static overrideMockables(instance:ProjMaker) {
        // by default, this does nothing
    }

    constructor() {
        this.runHygen = HygenRunner.runHygen
        this.gitConnector = new GitConnectorSync()
        ProjMaker.overrideMockables(this)
    }
    public runHygen :  ((hygen_args: string[], template_path: AbsPath, output_path: AbsPath ) => void)   // allow mocking
    public gitConnector : GitConnectorSync  // allow mocking


    public get templatedir() : AbsPath {
        if ( this.basedir ) return this.basedir
        return new AbsPath("./_templates")
    }
    
    public get basedir() : AbsPath | null {
        if ( process.env.HYGEN_TMPLS ) {
            return new AbsPath(process.env.HYGEN_TMPLS)
        }
        return null
    }

    public getDirForGenerator(unit_type:string) : AbsPath {
        return new AbsPath(this.basedir).add(unit_type).add('new')
    }

    public getDirForNewUnit(unit_name:string) : AbsPath {
        let current = new AbsPath('.')
        let basename = current.basename

        if ( StrUtils.isSimilar(unit_name, basename)) {
            return current
        }

        return current.add(unit_name)
    }

    public async new_unit(unit_type:string, unit_name:string)  {
        if ( !this.basedir ) throw new ProjMakerError.BasedirNotSet
        LOG(`type: ${unit_type}  name: ${unit_name}`)

        // verify that there is a generator for this unit type
        if ( !(this.getDirForGenerator(unit_type).isDir) ) {
            throw new ProjMakerError.NoGenerator(unit_type)
        }

        // decide whether to create the project in the current directory, or
        // to create a subdirectory with a matching name
        let outdir = this.getDirForNewUnit(unit_name)
        if ( outdir.abspath == null ) throw "Unexpected state: outdir.abspath is null"

        if ( !outdir.isDir ) {
            outdir.mkdirs()
        }

        // verify that the directory is empty
        let dircontents = outdir.dirContents
        if ( dircontents == null ) {
            throw new ProjMakerError.OutputDirNotFound(outdir.toString())
        }
        if ( dircontents.length > 0 ) {
            if ( dircontents.length != 1 || dircontents[0].basename != ".git") {
                throw new ProjMakerError.OutputDirNotEmpty(outdir.toString())
            }
        }

        // verify that the directory is inside a git repository        
        let git = this.gitConnector
        git.project_dir = outdir
        if ( !git.is_repo ) {
            throw new ProjMakerError.NotInGitRepo()
        }

        // do a 'git stash' before running the generator
        let did_stash = git.stash_with_untracked()
        
        try {
            // run the generator
            await this.runHygen([unit_type, 'new', '--name', unit_name], this.templatedir, outdir)
            
            // add and commit the changes
            git.add(outdir.abspath)
            git.commit(`[proj-maker autocommit] added unit '${unit_name}' of type '${unit_type}'`)
        } finally {   
            // undo the stash
            if ( did_stash ) {
                git.stash_pop()
            }
        }
    }
}