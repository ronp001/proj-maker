import {AbsPath} from './path_helper'
const { runner } = require('hygen')
const { render } = require('../node_modules/hygen/lib/render.js')
const execute = require('../node_modules/hygen/lib/execute');

const chalk = require('chalk')
const { yellow, red, green, magenta } = chalk
const template = require('chalk/templates')

class Logger {
    private log : (...args:any[]) => any = console.log
    constructor(log:()=>any) {
        this.log = log
    }
    colorful(msg:any) {
        this.log(template(chalk, msg))
    }
    notice(msg:any) {
        this.log(magenta(msg))
    }
    warn(msg:any) {
        this.log(yellow(msg))
    }
    err(msg:any) {
        this.log(red(msg))
    }
    ok(msg:any) {
        this.log(green(msg))
    }
}

export class HygenRunner {
    public static async runHygen(hygen_args: string[], template_path: AbsPath, output_path: AbsPath ) {
        function log(...args:any[]) {
            console.log(args)
        }
    
    
        const config = {
            templates: template_path.toString(),
            cwd: output_path.toString(),
            debug: true,
            exec: (action:any, body:any) => {
              const opts = body && body.length > 0 ? { input: body } : {}
              return require('execa').shell(action, opts)
            },
            // logger: new Logger(console.log.bind(console)),
            logger: new Logger(log),
        }
    
        await runner(hygen_args, config)
    }
}
