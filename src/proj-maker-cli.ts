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
        program.command('new <unit-type> <name>')
        .description("create a new unit of type <unit-type> with the name <name>")
        .action(this.action(this.new_unit));
        
        program.command('status')
        .alias('s')
        .description("show info")
        .action(this.action(this.status));
    }


    private async new_unit(unit_type: string, name: string, options:any) {
        let result = await this.proj_maker.new_unit(unit_type, name)
        console.log("ProjMaker:", result)
    }

    private status() {
        console.log("")
        console.log("ProjMaker")
        console.log("---------")
        console.log("Base directory ($HYGEN_TMPLS):", this.proj_maker.basedir ? this.proj_maker.basedir.toString() : chalk.red("NOT SET"))
        console.log("")
    }
}