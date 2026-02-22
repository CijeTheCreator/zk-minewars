global BOARD_SIZE: u32 = 9; // 9x9 board
global NUM_MINES: u32 = 5; // mines per player

fn is_valid(x: i32, y: i32) -> bool {
    (x >= 0) & (x < BOARD_SIZE as i32) & (y >= 0) & (y < BOARD_SIZE as i32)
}

// Checks if a single coordinate matches any mine in the list
pub fn is_mine(mines: [(Field, Field); NUM_MINES], x: Field, y: Field) -> bool {
    let mut found = false;
    for i in 0..NUM_MINES {
        if mines[i].0 == x {
            if mines[i].1 == y {
                found = true;
            }
        }
    }
    found
}

// Counts how many of the 8 neighbors are mines
pub fn count_adjacent(mines: [(Field, Field); NUM_MINES], x: Field, y: Field) -> Field {
    let xi = x as i32;
    let yi = y as i32;

    let mut count: Field = 0;

    let dx: [i32; 8] = [-1, 0, 1, -1, 1, -1, 0, 1];
    let dy: [i32; 8] = [-1, -1, -1, 0, 0, 1, 1, 1];

    for i in 0..8 {
        let nx = xi + dx[i];
        let ny = yi + dy[i];
        if is_valid(nx, ny) {
            if is_mine(mines, nx as u32 as Field, ny as u32 as Field) {
                count += 1;
            }
        }
    }

    count
}
