"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StrUtils {
    static canonize(str) {
        return str.replace(/_/g, '').replace(/-/g, '').replace(/\s/g, '').toLowerCase();
    }
    static isSimilar(str1, str2) {
        return StrUtils.canonize(str1) == StrUtils.canonize(str2);
    }
}
exports.StrUtils = StrUtils;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyX3V0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3N0cl91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBO0lBQ1csTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFVO1FBQzdCLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDakYsQ0FBQztJQUNNLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBVyxFQUFFLElBQVc7UUFDNUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0NBQ0o7QUFQRCw0QkFPQyJ9