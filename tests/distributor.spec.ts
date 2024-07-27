import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address, beginCell } from '@ton/core';

import { compile } from '@ton/blueprint';

import { Distributor } from '../wrappers/Distributor/Distributor';
import { JettonWallet } from '../wrappers/Jetton/JettonWallet';
import { JettonMinter } from '../wrappers/Jetton/JettonMinter';

import '@ton/test-utils';

import {
    BLOCKCHAIN_START_TIME,
    INITIAL_JETTON_BALANCE,
    openContractDistFactory,
    openContractJettonMinter,
} from './distributor';

type Codes = {
    jwallet: Cell;
    minter: Cell;
    distributor: Cell;
};

describe('IDO ', () => {
    const codes: Codes = {} as Codes;
    let blockchain: Blockchain;

    let owner: SandboxContract<TreasuryContract>;
    const users: SandboxContract<TreasuryContract>[] = [];

    let jettonWallet: (address: Address) => Promise<SandboxContract<JettonWallet>>;

    let distributor: SandboxContract<Distributor>;
    let minter: SandboxContract<JettonMinter> = {} as SandboxContract<JettonMinter>;

    beforeAll(async () => {
        codes.jwallet = await compile('/Jetton/JettonWallet');
        codes.minter = await compile('/Jetton/JettonMinter');
        codes.distributor = await compile('/Distributor/Distributor');
    });

    beforeEach(async () => {
        // Blockchain
        blockchain = await Blockchain.create();
        blockchain.now = BLOCKCHAIN_START_TIME;

        //Entities
        owner = await blockchain.treasury('owner');
        for (let i = 0; i < 10; i++) {
            users.push(await blockchain.treasury(`user${i}`));
        }

        //Minters

        minter = openContractJettonMinter(
            blockchain,
            owner.address,
            codes.jwallet,
            codes.minter,
            'https://some-url/content.json',
        );

        //Utils
        jettonWallet = async (address: Address) =>
            blockchain.openContract(JettonWallet.createFromAddress(await minter.getWalletAddress(address)));

        await minter.sendDeploy(owner.getSender(), toNano('1'));

        await minter.sendMint(owner.getSender(), owner.address, INITIAL_JETTON_BALANCE, toNano('0.05'), toNano('1'));

        for (let i = 0; i < users.length; i++) {
            await minter.sendMint(owner.getSender(), users[i].address, BigInt(0), toNano('0.05'), toNano('1'));
        }

        distributor = openContractDistFactory(blockchain, owner.address, codes.distributor, minter.address);

        const result = await distributor.sendDeploy(owner.getSender(), toNano('1'));

        expect(result.transactions).toHaveTransaction({
            from: undefined,
            to: owner.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            to: distributor.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: distributor.address,
            to: minter.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: minter.address,
            to: distributor.address,
            success: true,
        });
    });

    it('Distribution 10 users by value', async () => {
        const wallets = await Promise.all(users.map((user) => jettonWallet(user.address)));

        const owner_wallet = await jettonWallet(owner.address);

        const distributor_wallet = await jettonWallet(distributor.address);

        let payload = Distributor.userConfigToCell(
            { user_address: users[0].address, jetton_amount: toNano('1') },
            beginCell().endCell(),
        );

        for (let i = 1; i < users.length; i++) {
            payload = Distributor.userConfigToCell(
                { user_address: users[i].address, jetton_amount: toNano('1') },
                payload,
            );
        }

        payload = Distributor.userOptionToCell(payload, false);

        const res = await owner_wallet.sendTransfer(
            owner.getSender(),
            toNano('10000'),
            INITIAL_JETTON_BALANCE,
            distributor.address,
            distributor.address,
            beginCell().endCell(),
            toNano('5000'),
            payload,
        );

        expect(res.transactions).toHaveLength(45);

        expect(res.transactions).toHaveTransaction({
            from: undefined,
            to: owner.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: owner_wallet.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: owner_wallet.address,
            to: distributor_wallet.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: distributor_wallet.address,
            to: distributor.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: distributor.address,
            to: distributor_wallet.address,
            success: true,
        });

        for (let i = 0; i < users.length; i++) {
            expect(res.transactions).toHaveTransaction({
                from: distributor_wallet.address,
                to: wallets[i].address,
                success: true,
            });

            const balance = await wallets[i].getJettonBalance();

            expect(balance).toEqual(toNano('1'));
        }
    });

    it('Distribution 10 users by value', async () => {
        const wallets = await Promise.all(users.map((user) => jettonWallet(user.address)));

        const owner_wallet = await jettonWallet(owner.address);

        const distributor_wallet = await jettonWallet(distributor.address);

        let payload = Distributor.userConfigToCell(
            { user_address: users[0].address, jetton_amount: BigInt(1000) },
            beginCell().endCell(),
        );

        for (let i = 1; i < users.length; i++) {
            payload = Distributor.userConfigToCell(
                { user_address: users[i].address, jetton_amount: BigInt(1000) },
                payload,
            );
        }

        payload = Distributor.userOptionToCell(payload, true);

        const res = await owner_wallet.sendTransfer(
            owner.getSender(),
            toNano('10000'),
            INITIAL_JETTON_BALANCE,
            distributor.address,
            distributor.address,
            beginCell().endCell(),
            toNano('5000'),
            payload,
        );

        expect(res.transactions).toHaveLength(45);

        expect(res.transactions).toHaveTransaction({
            from: undefined,
            to: owner.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: owner.address,
            to: owner_wallet.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: owner_wallet.address,
            to: distributor_wallet.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: distributor_wallet.address,
            to: distributor.address,
            success: true,
        });

        expect(res.transactions).toHaveTransaction({
            from: distributor.address,
            to: distributor_wallet.address,
            success: true,
        });

        for (let i = 0; i < users.length; i++) {
            expect(res.transactions).toHaveTransaction({
                from: distributor_wallet.address,
                to: wallets[i].address,
                success: true,
            });

            const balance = await wallets[i].getJettonBalance();

            expect(balance).toEqual(INITIAL_JETTON_BALANCE / BigInt(10));
        }
    });
});
