const notImplemented = async () => {
  throw new Error("not implemented");
};

export function createCaller(_ctx: object) {
  return {
    task: {
      create: notImplemented,
      list: notImplemented,
      update: notImplemented,
      delete: notImplemented,
    },
  };
}
