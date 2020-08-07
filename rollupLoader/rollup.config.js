import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import livereload from "rollup-plugin-livereload";
const fs = require("fs");

function moonShade() {
  return {
    name: "MoonShade", // this name will show up in warnings and errors
    resolveId(source) {
      if (source.endsWith(".ms")) {
        return source; // this signals that rollup should not ask other plugins or check the file system to find this id
      }
      return null; // other ids should be handled as usually
    },
    load(id) {
      if (id.endsWith(".ms")) {
        this.addWatchFile(`src/${id}`);
        return fs.readFileSync(`src/${id}`, "utf8");
      }
      return null; // other ids should be handled as usually
    },
    watchChange(id) {
      if (id.endsWith(".ms")) {
        console.log("changed");
      }
      return null;
    },
  };
}

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/main.ts",
  output: {
    file: "public/bundle.js",
    format: "iife",
    sourcemap: true,
  },
  plugins: [
    livereload(),
    moonShade(),
    resolve(), // tells Rollup how to find date-fns in node_modules
    commonjs(), // converts date-fns to ES modules
    production && terser(), // minify, but only in production
  ],
};
