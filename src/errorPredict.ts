import { getAvailableCoins } from './sideshift';
import { detectNetwork } from './addressDetect';

// Error prediction for incompatible chains/addresses
export async function predictInputError(from: string, to: string, address: string): Promise<string | null> {
  const detected = detectNetwork(address);
  if (!detected) {
    return null; // Can't determine the network from the address
  }

  try {
    const allCoins = await getAvailableCoins();
    const toCoinInfo = allCoins.find((c: any) => c.coin.toLowerCase() === to.toLowerCase());

    if (!toCoinInfo) {
      return `The currency '${to}' is not supported.`;
    }

    const supportedNetworks = toCoinInfo.networks.map((n: any) => n.network.toLowerCase());

    if (!supportedNetworks.includes(detected.toLowerCase())) {
      return `Warning: The address you entered appears to be for the '${detected}' network, but ${to.toUpperCase()} on that network is not supported. Supported networks for ${to.toUpperCase()} are: ${supportedNetworks.join(', ')}.`;
    }

  } catch (error) {
    console.error("Error in predictInputError:", error);
    return "Could not verify the address network at this time.";
  }

  return null;
}
