import { toNano, Cell, Address } from '@ton/core';
import { Blockchain, Event } from '@ton/sandbox';
import { Distributor } from '../wrappers/Distributor/Distributor';
import { JettonMinter, jettonContentToCell } from '../wrappers/Jetton/JettonMinter';

// Blockchain
export const BLOCKCHAIN_START_TIME: number = 1000;

// Jetton
export const INITIAL_JETTON_BALANCE: bigint = toNano('1000.00');

export function openContractDistFactory(
    blockchain: Blockchain,
    owner_address: Address,
    distributor_code: Cell,
    jetton_minter_address: Address,
) {
    return blockchain.openContract(
        Distributor.createFromConfig(
            {
                init: 0,
                owner_address: owner_address,
                jetton_minter_address: jetton_minter_address,
                jetton_wallet_address: jetton_minter_address,
            },
            distributor_code,
        ),
    );
}

export function openContractJettonMinter(
    blockchain: Blockchain,
    jetton_sender_address: Address,
    jwallet_code: Cell,
    minter_code: Cell,
    uri: string,
) {
    const defaultContent: Cell = jettonContentToCell({ type: 1, uri: uri });

    return blockchain.openContract(
        JettonMinter.createFromConfig(
            {
                admin: jetton_sender_address,
                content: defaultContent,
                wallet_code: jwallet_code,
            },
            minter_code,
        ),
    );
}
