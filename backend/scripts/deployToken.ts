// Importation des modules nécessaires de Hardhat
import { ethers, network } from "hardhat";
import { verify } from "./verify";
import { vars } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

// Fonction principale asynchrone qui exécute le déploiement du contrat
async function main(): Promise<void> {

  // Déploiement du contrat Bank 
  const CercleToken = await ethers.deployContract("CercleToken");
  console.log(`Déploiement en cours...`);

  // Détection de l'environnement (local ou autre)
  const isLocalhost = network.name.includes("localhost");
  const hasEtherscanKey = !!vars.get("ETHERSCAN_API_KEY");

  // Si l'environnement n'est pas localhost, attendre 5 blocs avant la vérification
  if (!isLocalhost) {
    console.log("Attente de 5 blocs avant vérification...");
    await CercleToken.deploymentTransaction()?.wait(5);
  }

  // Affichage de l'adresse à laquelle le contrat a été déployé
  console.log(`Contrat déployé à : ${CercleToken.target}`);

  // Si l'environnement n'est pas localhost et qu'une clé Etherscan est disponible
  if (!isLocalhost && hasEtherscanKey) {
    console.log("Vérification du contrat sur l'explorateur...");
    // Appel de la fonction de vérification avec l'adresse du contrat et les arguments
    await verify(CercleToken.target.toString());
  }
}

// Appel de la fonction principale et gestion des erreurs potentielles
main().catch((error) => {
  console.error("Erreur :", error);
  process.exitCode = 1; // Définit le code de sortie à 1 en cas d'erreur
});