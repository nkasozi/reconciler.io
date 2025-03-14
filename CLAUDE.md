# CLAUDE.md - Assistant Guidelines

## Build/Test/Lint Commands

- Build: `npm run build`
- Dev server: `npm run dev`
- Format code: `npm run format`
- Lint: `npm run lint`
- Unit tests: `npm run test:unit`
- Single unit test: `npm run test:unit -- -t "test name"`
- E2E tests: `npm run test:e2e`

## Code Style Guidelines

- **Framework**: SvelteKit with TypeScript
- **Formatting**: Prettier with Svelte and TailwindCSS plugins
- **Types**: Use TypeScript interfaces/types for all props, state, and functions
- **Naming**:
  - Components: PascalCase
  - Variables/functions: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Imports**: Group and sort imports by external, then internal
- **Error Handling**: Use try/catch blocks and provide meaningful error messages
- **Components**: Keep components small, focused, and well-documented
- **Testing**: Write unit tests for components and utility functions
- For frontend code always pay attention to responsiveness...the ui has got to look nice and function well on mobile phones first.
- Make sure to use small sensible testable methods that take in the state via some parameters and return a value over functions that are hard to test or that operate over a global state..even if the method is supposed to return void, change it to return true or false or success/failure flags. write the code with the idea of unit testing in mind.
- Make sure all code has type annotations and return types.
- Make sure all variables/methods are well_named_according_to_what_they_do over short_vague_names e.g I prefer prefix_length over prefix_len and current_address_length over current_len or curr_addr_len etc. The length of the variable name doesn't matter compared to having it named according to what the variable means or does. Do not be afraid to use super-long variable names
- Avoid comments wherever possible in favor of helper methods or intermediate variables. Every time we have to write a comment, it is a sign that maybe we change the method's name or variable. it is better to have long_spelled_out_variable_and_method_names over short_vague_ones and comments
- Where possible...favor functional programming over unnecessary OOP classes/inheritance etc
- Pay attention to overall file length AND modularity!! Avoid super long methods or even super long code files. When the file gets too long...over 200 lines of code begin to aggresively move code out to other files and only import the functionality needed. Do NOT let code files get big and unmaintainable on your watch
- Make sure all code has debug logs where necessary with the idea that it helps a dev know what went wrong and from where just by looking at the logs. Debug logs should be for both the normal and abnormal flow of the code because not all bugs are when there is an obvious error.
- I want my code to flow like a story...it should tell an interesting story...show a little at first but then more the more one digs. An overview, then helper functions that are like steps or chapters in a story, and then a climax where all the results are displayed, etc. I use my code to tell a story..not just to solve a problem
- cleAlways run lint and tests before committing changes.
