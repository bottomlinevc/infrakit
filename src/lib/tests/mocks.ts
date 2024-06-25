import * as pulumi from "@pulumi/pulumi";

// Convert a pulumi.Output to a promise of the same type.
export function promiseOf<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => output.apply(resolve));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const resources: Map<string, any> = new Map();

class TestMocks implements pulumi.runtime.Mocks {
  outputs: any;

  constructor(outputs: any) {
    this.outputs = outputs;
  }

  call(args: pulumi.runtime.MockCallArgs): Record<string, any> {
    return args.inputs;
  }

  newResource(args: pulumi.runtime.MockResourceArgs): {
    id: string | undefined;
    state: Record<string, any>;
  } {
    const state = {
      ...args.inputs,
      name: args.name,
    };
    resources.set(args.name, state);

    switch (args.type) {
      case "pulumi:pulumi:StackReference":
        return {
          id: `${args.name}-id`,
          state: {
            outputs: this.outputs,
          },
        };
      default:
        return {
          id: `${args.name}-id`,
          state: args.inputs,
        };
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function initBeforeAll(
  config: Map<string, string>,
  mocks: Map<string, string | object>,
): void {
  process.env.PULUMI_CONFIG = JSON.stringify(Object.fromEntries(config));

  pulumi.runtime.setMocks(new TestMocks(Object.fromEntries(mocks)));
}
