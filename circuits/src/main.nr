use poseidon::poseidon2::Poseidon2;
mod utils;

fn main(
    // Private
    mines: [(Field, Field); 5],
    nullifier: Field,
    // Public
    clicked_x: pub Field,
    clicked_y: pub Field,
    hit: pub bool,
    adjacents: pub Field,
    commitment: pub Field,
) {
    // 1. Verify the mine list matches the on-chain commitment
    let computed_commitment = Poseidon2::hash(
        [
            mines[0].0, mines[0].1, mines[1].0, mines[1].1, mines[2].0, mines[2].1, mines[3].0,
            mines[3].1, mines[4].0, mines[4].1, nullifier,
        ],
        11,
    );
    assert_eq(commitment, computed_commitment);

    let computed_adjacents = utils::count_adjacent(mines, clicked_x, clicked_y);
    assert_eq(adjacents, computed_adjacents);

    let computed_hit = utils::is_mine(mines, clicked_x, clicked_y);
    assert_eq(hit, computed_hit);
}
