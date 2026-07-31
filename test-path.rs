use std::fs;
use std::path::PathBuf;

fn main() {
    let p = PathBuf::from("./src");
    for entry in fs::read_dir(&p).unwrap() {
        let entry = entry.unwrap();
        println!("Entry path: {:?}", entry.path());
        break;
    }
}
