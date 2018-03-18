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
const { runner } = require('hygen');
const { render } = require('../node_modules/hygen/lib/render.js');
const execute = require('../node_modules/hygen/lib/execute');
const chalk = require('chalk');
const { yellow, red, green, magenta } = chalk;
const template = require('chalk/templates');
class Logger {
    // private log : (...args:any[]) => any = console.log
    constructor(log) {
        // this.log = log
    }
    log(msg) {
        console.log(msg);
    }
    colorful(msg) {
        console.log(template(chalk, msg));
    }
    notice(msg) {
        console.log(magenta(msg));
    }
    warn(msg) {
        console.log(yellow(msg));
    }
    err(msg) {
        console.log(red(msg));
    }
    ok(msg) {
        console.log(green(msg));
    }
}
class HygenRunner {
    static runHygen(hygen_args, template_path, output_path) {
        return __awaiter(this, void 0, void 0, function* () {
            function log(...args) {
                console.log(args);
            }
            const config = {
                templates: template_path.toString(),
                cwd: output_path.toString(),
                debug: true,
                exec: (action, body) => {
                    const opts = body && body.length > 0 ? { input: body } : {};
                    return require('execa').shell(action, opts);
                },
                // logger: new Logger(console.log.bind(console)),
                logger: new Logger(log),
            };
            let dirinfo = chalk.blue(`(in ${output_path.toString()}) `);
            console.log(dirinfo + chalk.blue("hygen " + hygen_args.join(" ")));
            yield runner(hygen_args, config);
        });
    }
}
exports.HygenRunner = HygenRunner;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHlnZW5fcnVubmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2h5Z2VuX3J1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQ0EsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNuQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLHFDQUFxQyxDQUFDLENBQUE7QUFDakUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFFN0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQzlCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUE7QUFDN0MsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFFM0M7SUFDSSxxREFBcUQ7SUFDckQsWUFBWSxHQUFXO1FBQ25CLGlCQUFpQjtJQUNyQixDQUFDO0lBQ0QsR0FBRyxDQUFDLEdBQU87UUFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3BCLENBQUM7SUFDRCxRQUFRLENBQUMsR0FBTztRQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFDRCxNQUFNLENBQUMsR0FBTztRQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUNELElBQUksQ0FBQyxHQUFPO1FBQ1IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBQ0QsR0FBRyxDQUFDLEdBQU87UUFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFDRCxFQUFFLENBQUMsR0FBTztRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0IsQ0FBQztDQUNKO0FBRUQ7SUFDVyxNQUFNLENBQU8sUUFBUSxDQUFDLFVBQW9CLEVBQUUsYUFBc0IsRUFBRSxXQUFvQjs7WUFDM0YsYUFBYSxHQUFHLElBQVU7Z0JBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckIsQ0FBQztZQUdELE1BQU0sTUFBTSxHQUFHO2dCQUNYLFNBQVMsRUFBRSxhQUFhLENBQUMsUUFBUSxFQUFFO2dCQUNuQyxHQUFHLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRTtnQkFDM0IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsSUFBSSxFQUFFLENBQUMsTUFBVSxFQUFFLElBQVEsRUFBRSxFQUFFO29CQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7b0JBQzNELE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDN0MsQ0FBQztnQkFDRCxpREFBaUQ7Z0JBQ2pELE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDMUIsQ0FBQTtZQUVELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNwQyxDQUFDO0tBQUE7Q0FDSjtBQXZCRCxrQ0F1QkMifQ==