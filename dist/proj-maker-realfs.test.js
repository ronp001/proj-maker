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
///<reference types="jest"/>
const proj_maker_1 = require("../proj-maker");
const path_helper_1 = require("../path_helper");
let sandbox_path = new path_helper_1.AbsPath(__dirname).add('_sandbox');
let templates_path = sandbox_path.add('_templates');
let generator_path = templates_path.add('basic').add('new');
let output_path = new sandbox_path.add('_output');
let templates = {
    'file1.ejs.t': '---\nto: file1\n---\nthis is file1',
    'file2.ejs.t': '---\nto: file2\n---\nthis is file2'
};
function prepareSandbox() {
    if (sandbox_path.isDir) {
        sandbox_path.rmrfdir(/__tests__\/_sandbox/, false);
    }
    else {
        sandbox_path.mkdirs();
    }
    templates_path.mkdirs();
    output_path.add('empty').mkdirs();
    for (let fname in templates) {
        generator_path.add('new').add(fname).saveStrSync(templates[fname]);
    }
    expect(templates_path.add('basic/new/file1.ejs.t').exists).toBeTruthy();
}
beforeEach(() => __awaiter(this, void 0, void 0, function* () {
    prepareSandbox();
    process.chdir(output_path.toString());
}));
afterEach(() => __awaiter(this, void 0, void 0, function* () {
}));
describe('new unit', () => {
    beforeEach(() => {
        expect(generator_path.add('new').isDir).toBeTruthy();
    });
    test('creates ', () => {
        let pm = new proj_maker_1.ProjMaker;
        process.chdir('/empty');
        pm.new_unit('basic', 'empty');
        expect(output_path.add('empty').add('file1')).isFile;
    }).toBeTruthy();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci1yZWFsZnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qLW1ha2VyLXJlYWxmcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw0QkFBNEI7QUFDNUIsOENBQXVEO0FBR3ZELGdEQUF5QztBQUV6QyxJQUFJLFlBQVksR0FBRyxJQUFJLHFCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQ3pELElBQUksY0FBYyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDbkQsSUFBSSxjQUFjLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDM0QsSUFBSSxXQUFXLEdBQUcsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBRWpELElBQUksU0FBUyxHQUFJO0lBQ2IsYUFBYSxFQUFHLG9DQUFvQztJQUNwRCxhQUFhLEVBQUcsb0NBQW9DO0NBQ3ZELENBQUE7QUFFRDtJQUNJLEVBQUUsQ0FBQyxDQUFFLFlBQVksQ0FBQyxLQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLFlBQVksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDdkIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUVqQyxHQUFHLENBQUEsQ0FBQyxJQUFJLEtBQUssSUFBSSxTQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzFCLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBQ0QsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtBQUMzRSxDQUFDO0FBRUQsVUFBVSxDQUFDLEdBQVMsRUFBRTtJQUNsQixjQUFjLEVBQUUsQ0FBQTtJQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0FBQ3pDLENBQUMsQ0FBQSxDQUFDLENBQUE7QUFFRixTQUFTLENBQUMsR0FBUyxFQUFFO0FBQ3JCLENBQUMsQ0FBQSxDQUFDLENBQUE7QUFFRixRQUFRLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUN0QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ1osTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDeEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNsQixJQUFJLEVBQUUsR0FBRyxJQUFJLHNCQUFTLENBQUE7UUFDdEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUV2QixFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBQyxPQUFPLENBQUMsQ0FBQTtRQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFBQSxDQUFDLEFBQUQsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFBO0FBQ3RFLENBQUMsQ0FBQyxDQUFBIn0=