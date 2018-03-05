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
const path_helper_1 = require("./path_helper");
const str_utils_1 = require("./str_utils");
const logger_1 = require("./logger");
const chalk_1 = require("chalk");
const hygen_runner_1 = require("./hygen_runner");
const APP_VERSION = "0.2.0";
class ProjMakerError extends Error {
    constructor(msg) {
        super(chalk_1.default.red("ERROR -- " + msg));
        this.msg = msg;
    }
}
exports.ProjMakerError = ProjMakerError;
(function (ProjMakerError) {
    class BasedirNotSet extends ProjMakerError {
        constructor() { super("Base dir not set ($HYGEN_TMPLS)"); }
    }
    ProjMakerError.BasedirNotSet = BasedirNotSet;
    class OutputDirNotFound extends ProjMakerError {
        constructor(outdir) { super("Cannot find output directory: " + outdir); }
    }
    ProjMakerError.OutputDirNotFound = OutputDirNotFound;
    class OutputDirNotEmpty extends ProjMakerError {
        constructor(outdir) { super("Output directory not empty: " + outdir); }
    }
    ProjMakerError.OutputDirNotEmpty = OutputDirNotEmpty;
    class NoGenerator extends ProjMakerError {
        constructor(unit_type) { super("Cannot find generator for unit type: " + unit_type); }
    }
    ProjMakerError.NoGenerator = NoGenerator;
})(ProjMakerError = exports.ProjMakerError || (exports.ProjMakerError = {}));
class ProjMaker {
    constructor() {
        this.runHygen = hygen_runner_1.HygenRunner.runHygen; // allow mocking
    }
    get templatedir() {
        if (this.basedir)
            return this.basedir;
        return new path_helper_1.AbsPath("./_templates");
    }
    get basedir() {
        if (process.env.HYGEN_TMPLS) {
            return new path_helper_1.AbsPath(process.env.HYGEN_TMPLS);
        }
        return null;
    }
    getDirForGenerator(unit_type) {
        return new path_helper_1.AbsPath(this.basedir).add(unit_type).add('new');
    }
    getDirForNewUnit(unit_name) {
        let current = new path_helper_1.AbsPath('.');
        let basename = current.basename;
        if (str_utils_1.StrUtils.isSimilar(unit_name, basename)) {
            return current;
        }
        return current.add(unit_name);
    }
    new_unit(unit_type, unit_name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.basedir)
                throw new ProjMakerError.BasedirNotSet;
            logger_1.LOG(`type: ${unit_type}  name: ${unit_name}`);
            // verify that there is a generator for this unit type
            if (!(this.getDirForGenerator(unit_type).isDir)) {
                throw new ProjMakerError.NoGenerator(unit_type);
            }
            // decide whether to create the project in the current directory, or
            // to create a subdirectory with a matching name
            let outdir = this.getDirForNewUnit(unit_name);
            if (!outdir.isDir) {
                outdir.mkdirs();
            }
            // verify that the directory is empty
            let dircontents = outdir.dirContents;
            if (dircontents == null) {
                throw new ProjMakerError.OutputDirNotFound(outdir.toString());
            }
            if (dircontents.length > 0) {
                throw new ProjMakerError.OutputDirNotEmpty(outdir.toString());
            }
            // run the generator
            yield this.runHygen([unit_type, 'new', '--name', unit_name], this.templatedir, outdir);
        });
    }
}
exports.ProjMaker = ProjMaker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qLW1ha2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQ0FBcUM7QUFDckMsMkNBQW9DO0FBQ3BDLHFDQUE0QjtBQUU1QixpQ0FBeUI7QUFDekIsaURBQTBDO0FBRTFDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQTtBQUUzQixvQkFBNEIsU0FBUSxLQUFLO0lBQ3JDLFlBQW1CLEdBQVc7UUFBRyxLQUFLLENBQUMsZUFBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUFqRCxRQUFHLEdBQUgsR0FBRyxDQUFRO0lBQXNDLENBQUM7Q0FFeEU7QUFIRCx3Q0FHQztBQUVELFdBQWlCLGNBQWM7SUFDM0IsbUJBQTJCLFNBQVEsY0FBYztRQUFHLGdCQUFnQixLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQSxDQUFFLENBQUM7S0FBRTtJQUFwRyw0QkFBYSxnQkFBdUYsQ0FBQTtJQUNqSCx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTdILGdDQUFpQixvQkFBNEcsQ0FBQTtJQUMxSSx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLDhCQUE4QixHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTNILGdDQUFpQixvQkFBMEcsQ0FBQTtJQUN4SSxpQkFBeUIsU0FBUSxjQUFjO1FBQUcsWUFBWSxTQUFnQixJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsR0FBRyxTQUFTLENBQUMsQ0FBQSxDQUFFLENBQUM7S0FBRTtJQUFwSSwwQkFBVyxjQUF5SCxDQUFBO0FBQ3JKLENBQUMsRUFMZ0IsY0FBYyxHQUFkLHNCQUFjLEtBQWQsc0JBQWMsUUFLOUI7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