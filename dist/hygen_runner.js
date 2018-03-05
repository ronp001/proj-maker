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
    constructor(log) {
        this.log = console.log;
        this.log = log;
    }
    colorful(msg) {
        this.log(template(chalk, msg));
    }
    notice(msg) {
        this.log(magenta(msg));
    }
    warn(msg) {
        this.log(yellow(msg));
    }
    err(msg) {
        this.log(red(msg));
    }
    ok(msg) {
        this.log(green(msg));
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
            yield runner(hygen_args, config);
        });
    }
}
exports.HygenRunner = HygenRunner;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHlnZW5fcnVubmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2h5Z2VuX3J1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQ0EsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNuQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLHFDQUFxQyxDQUFDLENBQUE7QUFDakUsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFFN0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQzlCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUE7QUFDN0MsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFFM0M7SUFFSSxZQUFZLEdBQVc7UUFEZixRQUFHLEdBQTRCLE9BQU8sQ0FBQyxHQUFHLENBQUE7UUFFOUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7SUFDbEIsQ0FBQztJQUNELFFBQVEsQ0FBQyxHQUFPO1FBQ1osSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUNELE1BQU0sQ0FBQyxHQUFPO1FBQ1YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMxQixDQUFDO0lBQ0QsSUFBSSxDQUFDLEdBQU87UUFDUixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFDRCxHQUFHLENBQUMsR0FBTztRQUNQLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUNELEVBQUUsQ0FBQyxHQUFPO1FBQ04sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN4QixDQUFDO0NBQ0o7QUFFRDtJQUNXLE1BQU0sQ0FBTyxRQUFRLENBQUMsVUFBb0IsRUFBRSxhQUFzQixFQUFFLFdBQW9COztZQUMzRixhQUFhLEdBQUcsSUFBVTtnQkFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNyQixDQUFDO1lBR0QsTUFBTSxNQUFNLEdBQUc7Z0JBQ1gsU0FBUyxFQUFFLGFBQWEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ25DLEdBQUcsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFO2dCQUMzQixLQUFLLEVBQUUsSUFBSTtnQkFDWCxJQUFJLEVBQUUsQ0FBQyxNQUFVLEVBQUUsSUFBUSxFQUFFLEVBQUU7b0JBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtvQkFDM0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUM3QyxDQUFDO2dCQUNELGlEQUFpRDtnQkFDakQsTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUMxQixDQUFBO1lBRUQsTUFBTSxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3BDLENBQUM7S0FBQTtDQUNKO0FBckJELGtDQXFCQyJ9