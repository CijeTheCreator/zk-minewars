#![no_std]
use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype,
    panic_with_error, token::TokenClient, Address, Bytes, Env, Map, Vec,
};

#[contract]
pub struct Contract;

#[contracttype]
pub enum DataKey {
    GameData(u32),
    Players(u32),
    GameState(u32),
    State,
    LastGameId,
    MineBucksAddress,
    MoveWindows(u32),
    Mines(u32),
    Turns(u32),
    TimeWindow(u32),
    Board(u32),
    Submission(u32),
    VerifierAddress,
    Scores(u32),
    Lives(u32),
    Round(u32),
    GameResult(u32),
    GameHubAddress,
}

#[contracttype]
#[derive(Clone)]
pub enum TileValue {
    Hidden,
    Empty,
    Number(u32),
    Mine,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum GameResult {
    Ongoing,
    Player1,
    Player2,
    Draw,
}

#[contracttype]
#[derive(Clone)]
pub struct Tile {
    pub revealed: bool,
    pub value: TileValue,
}

#[contracttype]
#[derive(PartialEq)]
pub enum GameState {
    Lobby,
    Commiting,
    Playing,
    Abandoned,
    Ended,
}

#[derive(Clone)]
#[contracttype]
pub struct GameData {
    pub lives: u32,
    pub rounds: u32,
    pub stake: i128,
    pub session_id: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    UnauthorizedPlayer2 = 1,
    Player2AlreadyJoined = 2,
    UnauthorizedAbandonAction = 3,
    UnauthorizedAbandonWindowAction = 4,
    AlreadyAbandoned = 5,
    UnauthroizedMineCommiter = 6,
    GameNotCommiting = 7,
    YourTurn = 8,
    UnauthorizedPlayerForGame = 9,
    UnauthorizedPlayerForTurn = 10,
    VerificationFailed = 11,
    TileAlreadyRevealed = 12,
    InvalidTile = 13,
    AlreadyEnded = 14,
    HowDidWeEvenGetHere = 15,
    InvalidStake = 16,
}

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    VkParseError = 1,
    ProofParseError = 2,
    VerificationFailed = 3,
    VkNotSet = 4,
}

#[contractclient(name = "VerifierClient")]
pub trait Verifier {
    fn verify_proof(env: Env, public_inputs: Bytes, proof_bytes: Bytes) -> Result<(), Error>;
}

#[contractclient(name = "GamehubClient")]
pub trait GameHub {
    fn start_game(
        game_id: Address,
        session_id: u32,
        player1: Address,
        player2: Address,
        player1_points: i128,
        player2_points: i128,
    );

    fn end_game(session_id: u32, player1_won: bool);
}

/* EVENTS */
#[contractevent]
pub struct GameProposed {
    pub id: u32,
    pub lives: u32,
    pub rounds: u32,
    pub stake: i128,
    pub player1: Address,
    pub player2: Address,
}

#[contractevent]
pub struct GameJoined {
    pub id: u32,
    pub player2: Address,
}

#[contractimpl]
impl Contract {
    pub fn __constructor(env: Env, _minebucks: Address, _verifier: Address, _gamehub: Address) {
        env.storage().persistent().set(&DataKey::LastGameId, &0);
        env.storage()
            .persistent()
            .set(&DataKey::MineBucksAddress, &_minebucks);
        env.storage()
            .persistent()
            .set(&DataKey::VerifierAddress, &_verifier);
        env.storage()
            .persistent()
            .set(&DataKey::GameHubAddress, &_gamehub);
    }

    pub fn propose_game(
        env: Env,
        lives: u32,
        rounds: u32,
        stake: i128,
        player1: Address,
        player2: Address,
        time_window: u64,
    ) {
        player1.require_auth();
        let mut last_game_id: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::LastGameId)
            .unwrap();
        let current_game_data = GameData {
            lives,
            rounds,
            stake,
            session_id: last_game_id,
        };
        env.storage()
            .persistent()
            .set(&DataKey::GameData(last_game_id), &current_game_data);
        env.storage()
            .persistent()
            .set(&DataKey::TimeWindow(last_game_id), &time_window);
        env.storage()
            .persistent()
            .set(&DataKey::GameState(last_game_id), &GameState::Lobby);

        if stake < 0 {
            panic_with_error!(&env, ContractError::InvalidStake);
        }

        if stake > 0 {
            let minebucks: Address = env
                .storage()
                .persistent()
                .get(&DataKey::MineBucksAddress)
                .unwrap();
            TokenClient::new(&env, &minebucks).transfer_from(
                &env.current_contract_address(),
                &player1,
                &env.current_contract_address(),
                &stake,
            );
        }

        let mut current_game_players: Map<u32, Address> = Map::new(&env);
        current_game_players.set(0, player1.clone());
        current_game_players.set(1, player2.clone());

        env.storage()
            .persistent()
            .set(&DataKey::Players(last_game_id), &current_game_players);

        GameProposed {
            id: last_game_id,
            lives,
            rounds,
            stake,
            player1,
            player2,
        }
        .publish(&env);

        last_game_id += 1;
        env.storage()
            .persistent()
            .set(&DataKey::LastGameId, &last_game_id);
    }

    pub fn join_game(env: Env, game_id: u32, player2: Address) {
        player2.require_auth();
        let game_data: GameData = env
            .storage()
            .persistent()
            .get(&DataKey::GameData(game_id))
            .unwrap();
        let mut players: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Players(game_id))
            .unwrap();
        let mut game_state: GameState = env
            .storage()
            .persistent()
            .get(&DataKey::GameState(game_id))
            .unwrap();

        //TODO: Set game state to lobby in start game
        if game_state != GameState::Lobby {
            panic_with_error!(&env, ContractError::Player2AlreadyJoined);
        }

        if players.contains_key(1) {
            let stored_player2: Address = players.get(1).unwrap();
            if stored_player2 == player2 {
                game_state = GameState::Commiting;
            } else {
                panic_with_error!(&env, ContractError::UnauthorizedPlayer2);
            }
        } else {
            players.set(1, player2.clone());
            game_state = GameState::Commiting;
        }

        env.storage()
            .persistent()
            .set(&DataKey::GameState(game_id), &game_state);

        let stake: i128 = game_data.stake;
        if stake > 0 {
            let minebucks: Address = env
                .storage()
                .persistent()
                .get(&DataKey::MineBucksAddress)
                .unwrap();
            TokenClient::new(&env, &minebucks).transfer_from(
                &env.current_contract_address(),
                &player2,
                &env.current_contract_address(),
                &stake,
            );
        }

        /* Mappings/Values per player */
        let mut move_windows: Map<u32, u64> = Map::new(&env);
        let time_window: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::TimeWindow(game_id))
            .unwrap();
        let move_window: u64 = env.ledger().timestamp() + time_window;
        move_windows.set(0, move_window);
        move_windows.set(1, move_window);
        env.storage()
            .persistent()
            .set(&DataKey::MoveWindows(game_id), &move_windows);

        let mines: Map<u32, Bytes> = Map::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Mines(game_id), &mines);

        let mut turns: Map<u32, bool> = Map::new(&env);
        turns.set(0, true);
        turns.set(1, false);
        env.storage()
            .persistent()
            .set(&DataKey::Turns(game_id), &turns);

        let submission: Map<u32, u32> = Map::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Submission(game_id), &submission);

        let mut scores: Map<u32, u32> = Map::new(&env);
        scores.set(0, 0);
        scores.set(1, 0);
        env.storage()
            .persistent()
            .set(&DataKey::Scores(game_id), &scores);

        let mut lives: Map<u32, u32> = Map::new(&env);
        lives.set(0, game_data.lives);
        lives.set(1, game_data.lives);
        env.storage()
            .persistent()
            .set(&DataKey::Lives(game_id), &lives);

        env.storage().persistent().set(&DataKey::Round(game_id), &0);
        let board = init_board(&env);
        env.storage()
            .persistent()
            .set(&DataKey::Board(game_id), &board);

        let gamehub: Address = env
            .storage()
            .persistent()
            .get(&DataKey::GameHubAddress)
            .unwrap();
        let player_1: Address = players.get(0).unwrap();
        GamehubClient::new(&env, &gamehub).start_game(
            &env.current_contract_address(),
            &game_id,
            &player_1,
            &player2,
            &0,
            &0,
        );

        GameJoined {
            id: game_id,
            player2,
        }
        .publish(&env);
    }

    pub fn abandon(env: Env, game_id: u32, player_number: u32, player: Address) {
        player.require_auth();

        let turns: Map<u32, bool> = env
            .storage()
            .persistent()
            .get(&DataKey::Turns(game_id))
            .unwrap();
        let mut game_state: GameState = env
            .storage()
            .persistent()
            .get(&DataKey::GameState(game_id))
            .unwrap();
        let players: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Players(game_id))
            .unwrap();
        let stored_player: Address = players.get(player_number).unwrap();
        if player != stored_player {
            panic_with_error!(&env, ContractError::UnauthorizedAbandonAction);
        }

        let game_data: GameData = env
            .storage()
            .persistent()
            .get(&DataKey::GameData(game_id))
            .unwrap();
        let stake: i128 = game_data.stake;
        let minebucks: Address = env
            .storage()
            .persistent()
            .get(&DataKey::MineBucksAddress)
            .unwrap();

        if game_state == GameState::Lobby {
            if game_data.stake > 0 {
                TokenClient::new(&env, &minebucks).transfer(
                    &env.current_contract_address(),
                    &player,
                    &stake,
                );
            }

            game_state = GameState::Abandoned;
            env.storage()
                .persistent()
                .set(&DataKey::GameState(game_id), &game_state);
            return;
        }

        let other_player: u32 = if player_number == 1 { 0 } else { 1 };
        let other_player_turn: bool = turns.get(other_player).unwrap();

        if !other_player_turn {
            panic_with_error!(&env, ContractError::YourTurn);
        }

        let current_timestamp: u64 = env.ledger().timestamp();
        let move_windows: Map<u32, u64> = env
            .storage()
            .persistent()
            .get(&DataKey::MoveWindows(game_id))
            .unwrap();
        let other_player_move_window = move_windows.get(other_player).unwrap();

        if other_player_move_window > current_timestamp {
            panic_with_error!(&env, ContractError::UnauthorizedAbandonWindowAction);
        }

        let is_player_1: bool = if player_number == 0 { true } else { false };
        let game_hub: Address = env
            .storage()
            .persistent()
            .get(&DataKey::GameHubAddress)
            .unwrap();
        match game_state {
            GameState::Lobby => {
                panic_with_error!(&env, ContractError::HowDidWeEvenGetHere);
            }

            GameState::Commiting => {
                let other_player_address: Address = players.get(other_player).unwrap();
                if game_data.stake > 0 {
                    TokenClient::new(&env, &minebucks).transfer(
                        &env.current_contract_address(),
                        &player,
                        &stake,
                    );
                    TokenClient::new(&env, &minebucks).transfer(
                        &env.current_contract_address(),
                        &other_player_address,
                        &stake,
                    );
                }
            }

            GameState::Playing => {
                if game_data.stake > 0 {
                    let full_prize = stake * 2;
                    TokenClient::new(&env, &minebucks).transfer(
                        &env.current_contract_address(),
                        &player,
                        &full_prize,
                    );
                }
            }

            GameState::Abandoned => {
                panic_with_error!(&env, ContractError::AlreadyAbandoned);
            }

            GameState::Ended => {
                panic_with_error!(&env, ContractError::AlreadyEnded);
            }
        }
        GamehubClient::new(&env, &game_hub).end_game(&game_id, &is_player_1);
        game_state = GameState::Abandoned;
        env.storage()
            .persistent()
            .set(&DataKey::GameState(game_id), &game_state);
    }

    pub fn commit_mines(
        env: Env,
        game_id: u32,
        player_address: Address,
        player_number: u32,
        private_mines: Bytes,
    ) {
        /* Assert player is who they say they are*/
        player_address.require_auth();
        let mut game_state: GameState = env
            .storage()
            .persistent()
            .get(&DataKey::GameState(game_id))
            .unwrap();
        if game_state != GameState::Commiting {
            panic_with_error!(&env, ContractError::GameNotCommiting);
        }
        let players: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Players(game_id))
            .unwrap();
        let stored_player: Address = players.get(player_number).unwrap();
        if stored_player != player_address {
            panic_with_error!(&env, ContractError::UnauthroizedMineCommiter);
        }

        /* Submit proof */
        let mut mines: Map<u32, Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::Mines(game_id))
            .unwrap();
        mines.set(player_number, private_mines);
        env.storage()
            .persistent()
            .set(&DataKey::Mines(game_id), &mines);

        let other_player_number: u32 = if player_number == 0 { 1 } else { 0 };
        if mines.contains_key(other_player_number) {
            /* Start the Game */
            game_state = GameState::Playing;
            let time_window: u64 = env
                .storage()
                .persistent()
                .get(&DataKey::TimeWindow(game_id))
                .unwrap();
            let current_timestamp: u64 = env.ledger().timestamp();
            let mut move_windows: Map<u32, u64> = env
                .storage()
                .persistent()
                .get(&DataKey::MoveWindows(game_id))
                .unwrap();
            let mut turns: Map<u32, bool> = env
                .storage()
                .persistent()
                .get(&DataKey::Turns(game_id))
                .unwrap();
            let player_1_move_window = current_timestamp + time_window;
            move_windows.set(0, player_1_move_window);
            turns.set(0, true);
            turns.set(1, false);
            env.storage()
                .persistent()
                .set(&DataKey::MoveWindows(game_id), &move_windows);
            env.storage()
                .persistent()
                .set(&DataKey::Turns(game_id), &turns);
            env.storage()
                .persistent()
                .set(&DataKey::GameState(game_id), &game_state);
        }
    }

    #[allow(clippy::too_many_arguments)]
    #[allow(clippy::needless_return)]
    pub fn play_turn(
        env: Env,
        game_id: u32,
        next_round_x: u32,
        next_round_y: u32,
        player_address: Address,
        player_number: u32,
        previous_tile_is_mine: bool,
        next_round_tile_revealed_value: u32,
        previous_round_proof: Bytes,
        next_round_proof: Bytes,
    ) {
        if !(0..=8).contains(&next_round_x) || !(0..=8).contains(&next_round_y) {
            panic_with_error!(&env, ContractError::InvalidTile);
        }

        player_address.require_auth();
        let players: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Players(game_id))
            .unwrap();
        let stored_player = players.get(player_number).unwrap();
        if stored_player != player_address {
            panic_with_error!(&env, ContractError::UnauthorizedPlayerForGame)
        }

        let mut turns: Map<u32, bool> = env
            .storage()
            .persistent()
            .get(&DataKey::Turns(game_id))
            .unwrap();
        let is_player_turn: bool = turns.get(player_number).unwrap();

        if !is_player_turn {
            panic_with_error!(&env, ContractError::UnauthorizedPlayerForTurn);
        }

        let is_player_1_turn: bool = turns.get(0).unwrap();
        let round: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Round(game_id))
            .unwrap();

        let mut round_submission: Map<u32, u32> = env
            .storage()
            .persistent()
            .get(&DataKey::Submission(game_id))
            .unwrap();

        let mut board: Vec<Vec<Tile>> = env
            .storage()
            .persistent()
            .get(&DataKey::Board(game_id))
            .unwrap();

        let verifier_address: Address = env
            .storage()
            .persistent()
            .get(&DataKey::VerifierAddress)
            .unwrap();

        let commitments: Map<u32, Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::Mines(game_id))
            .unwrap();
        let player_commitment = commitments.get(player_number).unwrap();

        if !(round == 0 && is_player_1_turn) {
            let previous_round_x: u32 = round_submission.get(0).unwrap();
            let previous_round_y: u32 = round_submission.get(1).unwrap();
            let previous_round_tile_revealed_value: u32 = round_submission.get(2).unwrap();

            // TODO:
            /* Prove other player hit/did not hit a mine */
            let previous_round_public_inputs: Bytes = encode_public_inputs(
                &env,
                previous_round_x,
                previous_round_y,
                previous_tile_is_mine,
                previous_round_tile_revealed_value,
                player_commitment.clone(),
            );
            VerifierClient::new(&env, &verifier_address)
                .try_verify_proof(&previous_round_public_inputs, &previous_round_proof)
                .unwrap()
                .unwrap();

            let mut row = board.get(previous_round_y).unwrap();
            let mut tile = row.get(previous_round_x).unwrap();

            if tile.revealed {
                panic_with_error!(&env, ContractError::TileAlreadyRevealed);
            }

            tile.revealed = true;
            tile.value = if previous_tile_is_mine {
                TileValue::Mine
            } else if previous_round_tile_revealed_value == 0 {
                TileValue::Empty
            } else {
                TileValue::Number(previous_round_tile_revealed_value)
            };

            row.set(previous_round_x, tile);
            board.set(previous_round_y, row);

            if !previous_tile_is_mine && previous_round_tile_revealed_value == 0 {
                reveal_adjacent(previous_round_x, previous_round_y, &mut board);
            }

            env.storage()
                .persistent()
                .set(&DataKey::Board(game_id), &board);

            if next_round_x == previous_round_x && next_round_y == previous_round_y {
                panic_with_error!(&env, ContractError::TileAlreadyRevealed);
            }
        }

        /* TODO: */
        /* Prove it is not a mine, prove the number of mines around is x */

        let next_row = board.get(next_round_y).unwrap();
        let next_tile = next_row.get(next_round_x).unwrap();

        if next_tile.revealed {
            panic_with_error!(&env, ContractError::TileAlreadyRevealed);
        }

        let next_round_public_inputs: Bytes = encode_public_inputs(
            &env,
            next_round_x,
            next_round_y,
            false,
            next_round_tile_revealed_value,
            player_commitment,
        );
        VerifierClient::new(&env, &verifier_address)
            .try_verify_proof(&next_round_public_inputs, &next_round_proof)
            .unwrap()
            .unwrap();

        /* Submit tile in the UI (new tiles in the UI) */
        round_submission.set(0, next_round_x);
        round_submission.set(1, next_round_y);
        round_submission.set(2, next_round_tile_revealed_value);
        env.storage()
            .persistent()
            .set(&DataKey::Submission(game_id), &round_submission);

        let other_player = if player_number == 0 { 1 } else { 0 };
        turns.set(player_number, false);
        turns.set(other_player, true);
        env.storage()
            .persistent()
            .set(&DataKey::Turns(game_id), &turns);

        let current_timestamp: u64 = env.ledger().timestamp();
        let time_window: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::TimeWindow(game_id))
            .unwrap();
        let mut move_windows: Map<u32, u64> = env
            .storage()
            .persistent()
            .get(&DataKey::MoveWindows(game_id))
            .unwrap();
        move_windows.set(other_player, current_timestamp + time_window);
        env.storage()
            .persistent()
            .set(&DataKey::MoveWindows(game_id), &move_windows);

        /* Update scores */
        let mut scores: Map<u32, u32> = env
            .storage()
            .persistent()
            .get(&DataKey::Scores(game_id))
            .unwrap();
        let mut lives: Map<u32, u32> = env
            .storage()
            .persistent()
            .get(&DataKey::Lives(game_id))
            .unwrap();
        let other_player_lives: u32 = lives.get(other_player).unwrap();
        let current_player_score: u32 = scores.get(player_number).unwrap();
        let other_player_score: u32 = scores.get(other_player).unwrap();

        if previous_tile_is_mine {
            lives.set(other_player, other_player_lives - 1);
            scores.set(player_number, current_player_score + 1);
        } else {
            scores.set(other_player, other_player_score + 1);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Lives(game_id), &lives);
        env.storage()
            .persistent()
            .set(&DataKey::Scores(game_id), &scores);

        /* Check end game conditions */
        if player_number == 0 {
            return;
        }

        let mut round: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Round(game_id))
            .unwrap();
        round += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Round(game_id), &round);

        let player_1_lives = lives.get(0).unwrap();
        let player_2_lives = lives.get(1).unwrap();
        let game_data: GameData = env
            .storage()
            .persistent()
            .get(&DataKey::GameData(game_id))
            .unwrap();

        if !(player_1_lives == 0 || player_2_lives == 0 || game_data.rounds == round) {
            return;
        }

        /* If the proposer does not win, we can attribute a draw to the other player */
        /* Kinda balances out the fact that the non-proposer spends a bit more gas */
        /* Also, only player 2 can execute these parts, so assume the player down here is player2 */
        let game_hub: Address = env
            .storage()
            .persistent()
            .get(&DataKey::GameHubAddress)
            .unwrap();

        #[allow(clippy::if_same_then_else)]
        let result = if player_1_lives == 0 && player_2_lives == 0 {
            GamehubClient::new(&env, &game_hub).end_game(&game_id, &false);
            GameResult::Draw
        } else if player_1_lives == 0 {
            GamehubClient::new(&env, &game_hub).end_game(&game_id, &false);
            GameResult::Player2
        } else if player_2_lives == 0 {
            GamehubClient::new(&env, &game_hub).end_game(&game_id, &true);
            GameResult::Player1
        } else if player_1_lives > player_2_lives {
            GamehubClient::new(&env, &game_hub).end_game(&game_id, &true);
            GameResult::Player1
        } else if player_2_lives > player_1_lives {
            GamehubClient::new(&env, &game_hub).end_game(&game_id, &false);
            GameResult::Player2
        } else {
            GamehubClient::new(&env, &game_hub).end_game(&game_id, &false);
            GameResult::Draw
        };

        env.storage()
            .persistent()
            .set(&DataKey::GameResult(game_id), &result);
        env.storage()
            .persistent()
            .set(&DataKey::GameState(game_id), &GameState::Ended);

        if game_data.stake == 0 {
            return;
        }

        let player_1: Address = players.get(0).unwrap();
        let player_2: Address = players.get(1).unwrap();
        let minebucks: Address = env
            .storage()
            .persistent()
            .get(&DataKey::MineBucksAddress)
            .unwrap();
        let full_prize = &game_data.stake * 2;
        if result == GameResult::Draw {
            TokenClient::new(&env, &minebucks).transfer(
                &env.current_contract_address(),
                &player_1,
                &game_data.stake,
            );
            TokenClient::new(&env, &minebucks).transfer(
                &env.current_contract_address(),
                &player_2,
                &game_data.stake,
            );
        } else if result == GameResult::Player1 {
            TokenClient::new(&env, &minebucks).transfer(
                &env.current_contract_address(),
                &player_1,
                &full_prize,
            );
        } else if result == GameResult::Player2 {
            TokenClient::new(&env, &minebucks).transfer(
                &env.current_contract_address(),
                &player_2,
                &full_prize,
            );
        }
    }
}

/* Helper functions */
fn encode_public_inputs(
    env: &Env,
    x: u32,
    y: u32,
    hit: bool,
    adjacents: u32,
    commitment: Bytes,
) -> Bytes {
    let mut buf = [0u8; 160]; // 5 × 32 bytes
    buf[28..32].copy_from_slice(&x.to_be_bytes());
    buf[60..64].copy_from_slice(&y.to_be_bytes());
    buf[95] = hit as u8;
    buf[124..128].copy_from_slice(&adjacents.to_be_bytes());

    // slot 4: commitment (up to 32 bytes, right-aligned)
    let len = (commitment.len() as usize).min(32);
    let offset = 160 - len;
    let mut commitment_slice = [0u8; 32];
    commitment.copy_into_slice(&mut commitment_slice[..len]);
    buf[offset..160].copy_from_slice(&commitment_slice[..len]);

    Bytes::from_slice(env, &buf)
}

fn reveal_adjacent(cx: u32, cy: u32, board: &mut Vec<Vec<Tile>>) {
    for dy in 0u32..3 {
        for dx in 0u32..3 {
            if dy == 1 && dx == 1 {
                continue;
            }
            let nx = cx as i32 + dx as i32 - 1;
            let ny = cy as i32 + dy as i32 - 1;
            if nx < 0 || ny < 0 || nx >= 9 || ny >= 9 {
                continue;
            }
            let nx = nx as u32;
            let ny = ny as u32;

            let mut row = board.get(ny).unwrap();
            let mut tile = row.get(nx).unwrap();
            if !tile.revealed {
                tile.revealed = true;
                tile.value = TileValue::Empty;
                row.set(nx, tile);
                board.set(ny, row);
            }
        }
    }
}

fn init_board(env: &Env) -> Vec<Vec<Tile>> {
    let mut board: Vec<Vec<Tile>> = Vec::new(env);
    for _ in 0..9u32 {
        let mut row: Vec<Tile> = Vec::new(env);
        for _ in 0..9u32 {
            row.push_back(Tile {
                revealed: false,
                value: TileValue::Hidden,
            });
        }
        board.push_back(row);
    }
    board
}

mod test;
