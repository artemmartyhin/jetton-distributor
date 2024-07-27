import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
} from '@ton/core';

export type DistributorConfig = {
    init: number;
    owner_address: Address;
    jetton_minter_address: Address;
    jetton_wallet_address: Address;
};

export type UserConfig = {
    user_address: Address;
    jetton_amount: bigint;
};

export class Distributor implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Distributor(address);
    }

    static createFromConfig(config: DistributorConfig, code: Cell, workchain = 0) {
        const data = Distributor.distConfigToCell(config);
        const init = { code, data };
        return new Distributor(contractAddress(workchain, init), init);
    }

    static userConfigToCell(config: UserConfig, nextCell: Cell): Cell {
        return beginCell()
            .storeAddress(config.user_address)
            .storeCoins(config.jetton_amount)
            .storeRef(nextCell)
            .endCell();
    }

    static distConfigToCell(config: DistributorConfig): Cell {
        return beginCell()
            .storeUint(config.init, 1)
            .storeAddress(config.owner_address)
            .storeAddress(config.jetton_minter_address)
            .storeAddress(config.jetton_wallet_address)
            .endCell();
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
