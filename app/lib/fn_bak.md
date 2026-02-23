    const server = new StellarRpc.Server("https://soroban-testnet.stellar.org");
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID!;
    const contract = new Contract(contractId);
    await setAllowed();
    const { address } = await getAddress();
    console.log(address);
    const account = await server.getAccount(address);
    const tx = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "propose_game",
          nativeToScVal(config.lives, { type: "u32" }),
          nativeToScVal(config.rounds, { type: "u32" }),
          nativeToScVal(config.stake, { type: "i128" }),
          new Address(address).toScVal(),
          new Address(config.playerAddress!).toScVal(),
          nativeToScVal(config.playWindow, { type: "u64" }),
        ),
      )
      .setTimeout(30)
      .build();
    const preparedTx = await server.prepareTransaction(tx);
    const signedTransaction = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: StellarSdk.Networks.TESTNET,
    });
    const transactionResult = await server.sendTransaction(
      StellarSdk.TransactionBuilder.fromXDR(
        signedTransaction.signedTxXdr,
        StellarSdk.Networks.TESTNET,
      ),
    );

    console.log("Transaction submitted:", transactionResult);
    const txHash = transactionResult.hash;

    // Poll for transaction completion
    const pollTransaction = async (hash: string) => {
      const MAX_RETRIES = 20;
      const POLL_INTERVAL_MS = 3000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const txResponse = await server.getTransaction(hash);
        console.log(`Poll attempt ${attempt} - Status:`, txResponse.status);

        if (txResponse.status === "SUCCESS") {
          console.log("Transaction confirmed!", txResponse);
          // contractEventsXdr[0][0] is a ContractEvent, not an ScVal directly
          const contractEventXdr = txResponse.events.contractEventsXdr[0][0];

          // Parse it as a ContractEvent first
          const contractEvent = StellarSdk.xdr.ContractEvent.fromXDR(
            contractEventXdr.toXDR(),
          );
          const eventV0 = contractEvent.body().value();

          // First topic is the event name (a Symbol ScVal)
          const eventName = scValToNative(eventV0.topics()[0]);

          // The actual data lives in the event body's data field
          const eventData = contractEvent.body().value().data();

          const readable = scValToNative(eventData) || null;
          console.log("Event Name: ", eventName);
          console.log("Event: ", readable);
          return txResponse;
        }

        if (txResponse.status === "FAILED") {
          console.error("Transaction failed:", txResponse);
          throw new Error(`Transaction failed: ${txResponse}`);
        }

        // Status is PENDING or NOT_FOUND — keep polling
        console.log("Still pending, retrying...");
      }

      throw new Error("Transaction polling timed out after max retries");
    };

    await pollTransaction(txHash);
