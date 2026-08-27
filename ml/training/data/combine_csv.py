from pathlib import Path

import pandas as pd


OUTPUT_FILE = "combined_data.csv"
SOURCE_FILES = ("data1.csv", "data2.csv", "data3.csv")


def combine_csv_files() -> Path:
    data_dir = Path(__file__).resolve().parent
    output_path = data_dir / OUTPUT_FILE
    csv_files = [data_dir / filename for filename in SOURCE_FILES]

    missing_files = [path.name for path in csv_files if not path.is_file()]
    if missing_files:
        raise FileNotFoundError(
            f"В папке {data_dir} не найдены исходные файлы: "
            f"{', '.join(missing_files)}"
        )

    frames: list[pd.DataFrame] = []
    for csv_file in csv_files:
        frame = pd.read_csv(csv_file)
        frame = frame.rename(columns={"comment": "text", "toxic": "label"})

        required_columns = {"text", "label"}
        if not required_columns.issubset(frame.columns):
            raise ValueError(
                f"{csv_file.name}: ожидаются колонки text,label "
                f"или comment,toxic; найдены {list(frame.columns)}"
            )

        frames.append(frame[["text", "label"]])
        print(f"Добавлен {csv_file.name}: {len(frame)} строк")

    combined = pd.concat(frames, ignore_index=True)
    combined.to_csv(output_path, index=False, encoding="utf-8")
    print(f"Готово: {output_path} ({len(combined)} строк)")
    return output_path


if __name__ == "__main__":
    combine_csv_files()
