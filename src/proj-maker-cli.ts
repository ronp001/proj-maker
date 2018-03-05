import * as program from 'commander'  
import * as fs from "fs"
import chalk from 'chalk'
import {CliApp} from "./cli-app"
import {AbsPath} from "./path_helper"
import {ProjMaker,ProjMakerError} from './proj-maker'

export default class ProjMakerCli extends CliApp {
    
    private proj_maker : ProjMaker = new ProjMaker();

    protected beforeCommand() {
        // executed before command starts        
    }

    protected afterCommand() {
        // executed after command completes
    }

    protected _init() {

        program
        .description('proj-maker - not described yet')
        .version('0.1.0')
        .option('-v, --verbose', "provide more info")

        //-------------------------
        // Commands
        //-------------------------
        program.command('go')
        .description("do something")
        .action(this.action(this.go));
                
    }


    private go(options:any) {
        let result = this.proj_maker.go()
        console.log("Demo App:", result)
    }

}