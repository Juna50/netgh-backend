const SERVICE_LABELS = {
  ESIM: "eSIM Registration",
  AFA: "AFA Registration",
  CHECKER: "Results Checker Service",
  DATA: "Data Bundle",
  AIRTIME: "Airtime",
}

function resolveServiceLabel(order) {
  // 1. If product exists and has name → highest priority
  if (order.product?.name) {
    return order.product.name
  }

  // 2. Fallback to mapped serviceType
  if (order.serviceType && SERVICE_LABELS[order.serviceType]) {
    return SERVICE_LABELS[order.serviceType]
  }

  // 3. Last fallback
  return order.serviceType || "Unknown Service"
}

function resolveServiceTypeLabel(order) {
  // Product-based orders
  if (order.product?.network) {
    return order.product.network;
  }

  if (order.product?.cardType) {
    return order.product.cardType;
  }

  // Checker service
  if (order.cardType) {
    return order.cardType;
  }

  // Airtime/Data orders
  if (order.network) {
    return order.network;
  }

  return "—";
}

module.exports = { resolveServiceLabel, resolveServiceTypeLabel }