import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import fs from "fs";
import { Twisters } from "twisters";
import chalk from "chalk";
import { getCoinOfValue } from "@polymedia/suits";

const sendTransaction = async (client, bytes, signature) => {
    try {
        await client.dryRunTransactionBlock({ transactionBlock: bytes });
        const result = await client.executeTransactionBlock({
            signature,
            transactionBlock: bytes,
            requestType: "WaitForLocalExecution",
            options: {
                showEffects: true,
            },
        });
        return result;
    } catch (error) {
        throw error;
    }
};

const reverseCalculateBalance = (balance, multiplier) => balance * Math.pow(10, multiplier);
const gasBudget = "10000000";

const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

const calculateBalance = (totalBalance, divider) => Number(totalBalance) / Math.pow(10, divider);
const OCEAN_PACKAGE_ID = "0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9";
const OCEAN_COIN_TYPE = `${OCEAN_PACKAGE_ID}::ocean::OCEAN`;
const TARGET_ADDRESS = "target address";
const main = async () => {
    const pltmneomic = [
        "pharse 1",
        "pharse 2 dan seterusnnya"
    ];
    await Promise.all(
        pltmneomic.map(async (mnemonic) => {
            const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
            const suiAddress = keypair.getPublicKey().toSuiAddress();

            const suiBalance = await client.getBalance({
                owner: suiAddress,
                coinType: OCEAN_COIN_TYPE,
            });
            let suiBalanceFormatted = calculateBalance(suiBalance.totalBalance, 9);

            if (suiBalance.totalBalance < 1) {
                console.log(`${suiAddress} You have ${suiBalanceFormatted} OCEAN`);
                return;
            }

            console.log(`${suiAddress} | You have ${suiBalanceFormatted} OCEAN`);

            const amount = `${suiBalanceFormatted - 1}.0`;
            const floatAmountTransfer = parseFloat(amount);
            const amountToSendResult = reverseCalculateBalance(floatAmountTransfer, 9);

            if (suiBalance.totalBalance < amountToSendResult + parseFloat(gasBudget)) {
                console.log(`Insufficient balance for transfer and gas fee.`);
                return;
            }

            const txbTfOcean = new TransactionBlock();
            const [coin] = await getCoinOfValue(client, txbTfOcean, suiAddress, OCEAN_COIN_TYPE, amountToSendResult);
            txbTfOcean.transferObjects([coin], txbTfOcean.pure(TARGET_ADDRESS));
            txbTfOcean.setGasBudget(gasBudget);
            txbTfOcean.setSender(suiAddress);

            const { bytes, signature } = await txbTfOcean.sign({
                client,
                signer: keypair,
            });

            try {
                const txTfResult = await sendTransaction(client, bytes, signature);
                if (txTfResult.effects.status.status === "success") {
                    console.log(`Transfer ${floatAmountTransfer} OCEAN to ${TARGET_ADDRESS} - Success`);
                } else {
                    console.log(`Transfer ${floatAmountTransfer} OCEAN to ${TARGET_ADDRESS} - Failed`);
                    console.log(txTfResult);
                }
            } catch (error) {
                console.error('Transaction failed:', error);
            }
        })
    );
}

main().catch((error) => {
    console.error(error);
});
