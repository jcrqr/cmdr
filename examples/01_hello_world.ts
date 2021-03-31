import { cmdr } from "../mod.ts";

type Options = {
  readonly name: ReadonlyArray<string>;
  readonly question: string;
  readonly version: boolean;
  readonly help: boolean;
};

const { usage, match } = cmdr<Options>(
  "hello-world <NAME>... -q, --question=<QUESTION> -v, --version -h, --help",
)(Deno.args);

if (match.help) {
  console.info(usage.string);
  Deno.exit(0);
}

if (match.version) {
  console.log("Version: 0.0.0");
  Deno.exit(0);
}

if (match.name.length === 0) {
  console.error("Please, specify at least one <NAME>");
  Deno.exit(1);
}

const namesCombined = match.name.join(", ").replace(
  `, ${match.name[match.name.length - 1]}`,
  ` and ${match.name[match.name.length - 1]}`,
);

console.log(`Hello, ${namesCombined}!`);

if (match.question) {
  console.log(`Here's a question: ${match.question}`);
}
