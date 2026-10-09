import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore, type CartProduct } from "./cart-store";

describe("useCartStore", () => {
  const dummyProduct: CartProduct = {
    id: "prod-1",
    name: "Minyak Herba Sinergi",
    sku: "MHS-01",
    categoryId: "cat-1",
    memberPrice: 40000,
    retailPrice: 50000,
    pv: 10,
    imageUrl: null,
    stock: 5,
  };

  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it("adds item to empty cart", () => {
    useCartStore.getState().add(dummyProduct);
    const lines = useCartStore.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(1);
    expect(lines[0].product.id).toBe("prod-1");
  });

  it("increments quantity on re-adding, not exceeding stock", () => {
    useCartStore.getState().add(dummyProduct);
    useCartStore.getState().add(dummyProduct);
    expect(useCartStore.getState().lines[0].quantity).toBe(2);

    // Try to exceed stock limit (5)
    for (let i = 0; i < 10; i++) {
      useCartStore.getState().add(dummyProduct);
    }
    expect(useCartStore.getState().lines[0].quantity).toBe(5);
  });

  it("removes line when quantity set to 0", () => {
    useCartStore.getState().add(dummyProduct);
    useCartStore.getState().setQuantity("prod-1", 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it("clears all lines", () => {
    useCartStore.getState().add(dummyProduct);
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});
