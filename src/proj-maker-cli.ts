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
        if ( program.verbose ) {
            this.proj_maker.verbose = true
        }
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
        .option('-n, --generator-version <n>', 'use an older version of the generator for <unit-type>', parseInt)
        .action(this.action(this.new_unit));
        
        program.command('update [unit-name]')
        .description("updates the current unit to the latest version of the generator")
        .action(this.action(this.update));
        
        program.command('status')
        .alias('s')
        .description("show info")
        .action(this.action(this.status));

        program.command('list')
        .alias('l')
        .description("list available unit types")
        .action(this.action(this.list_unit_types));
    }


    private async new_unit(unit_type: string, name: string, options:any) {
        try {
            await this.proj_maker.new_unit(unit_type, name, options.generatorVersion ? options.generatorVersion : null)
        } catch ( e ) {
            console.error(e.message)
        }
    }

    private async update(unit_name? : string) {
        try {
            await this.proj_maker.update_unit(unit_name)
        } catch ( e ) {
            console.error(e.message)
        }
    }

    private status() {
        console.log("")
        console.log("ProjMaker")
        console.log("---------")
        console.log("Templates directory ($HYGEN_TMPLS):", this.proj_maker.templatedir.isDir ? this.proj_maker.templatedir.toString() : chalk.red("NOT SET"))
        console.log("")
    }

    private list_unit_types() {
        console.log("Available unit types:")
        let dirs = this.proj_maker.templatedir.foreachEntryInDir( (entry:AbsPath, direction: "down"|"up"|null)=> {
            if ( direction == "down" && entry.isDir && entry.add("new").isDir ) {
                console.log(chalk.bold(` ${entry.basename}`))
            }
        })
    }
}