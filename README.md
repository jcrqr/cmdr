# cmdr

> A simple module to parse CLI arguments, flags and options.

### Goals:

- Simple to use
- Easy configuration
- Arguments validation (*todo*)
- Auto-generated manual (*todo*)

**NOTE:** expect it to break before `1.0.0` release.

## Getting Started

```typescript
import { cmdr } from "https://deno.land/x/cmdr/mod.ts";

type Options = { name: string; help: boolean };

const { usage, match } cmdr<Options>("hello-world <NAME> -h, --help");

if (match.help) {
  console.info(usage.string);
  Deno.exit(0);
}

console.info(`Hello, ${match.name ? match.name : 'you there'}!`);
```

## Example

Check more exaples [here](/examples).

```typescript
// main.ts

import { cmdr } from "https://deno.land/x/cmdr/mod.ts";

const { usage, match } = cmdr<Options>(
  "hello-world <NAME>... -q, --question=<QUESTION> -v, --version -h, --help",
)(Deno.args);

if (match.help) {
  console.info(usage.string);
  Deno.exit(0)
}

if (match.version) {
  console.log("Version: 0.0.0");
  Deno.exit(0);
}

if (match.name.length === 0) {
  console.error("Please, specify at least one <NAME>")
  Deno.exit(1);
}

const namesCombined = match.name.join(", ").replace(
  `, ${match.name[match.name.length - 1]}`,
  ` and ${match.name[match.name.length - 1]}`,
);

console.log(`Hello, ${namesCombined}!`);

if (match.question) {
  console.log(`Here's a question: ${match.question}`)
}
```

### Running the example

```bash
$ deno run ./main.ts -q "what do you want for dinner?" John Alice Joe
Hello, John, Alice and Joe!
Here's a question: what do you want for dinner?
```

### Compiling the example

```bash
$ deno compile --unstable --lite -o hello_world ./main.ts
...
$ ./hello_world -q "what do you want for dinner?" John Alice Joe
Hello, John, Alice and Joe!
Here's a question: what do you want for dinner?
```

## Contributing

All contributions are very welcome!

If you find any bug or have a feature request, please [open a new issue](/issues).

For code or documentation contributions, [fork this repository](), do your thing, and submit a [Pull Request]().

## License

This project is released under the [MIT License](/LICENSE).
