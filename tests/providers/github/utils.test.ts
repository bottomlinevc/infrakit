import "jest";
import * as utils from "@/providers/github/utils";

describe("when using utils", () => {
  it("should correctly return the crypto hash", () => {
    expect(utils.getShortHash("test")).toBe("9f86d0");
  });
});
