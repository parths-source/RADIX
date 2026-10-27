from app.services.normalization import canonical_name, normalize_name


def test_normalize_keeps_plus_hash_dot():
    assert normalize_name("  C++ ") == "c++"
    assert normalize_name("C#") == "c#"
    assert normalize_name("Node.js") == "node.js"


def test_normalize_collapses_whitespace_and_strips_noise():
    assert normalize_name("Object-Oriented   Design!") == "object oriented design"
    assert normalize_name("(Python)") == "python"
    assert normalize_name("Python.") == "python"


def test_aliases_map_to_one_canonical_name():
    assert canonical_name("Postgres") == canonical_name("PostgreSQL") == "postgresql"
    assert canonical_name("OOP") == canonical_name("object-oriented programming")
    assert canonical_name("k8s") == "kubernetes"


def test_distinct_skills_stay_distinct():
    assert canonical_name("Java") != canonical_name("JavaScript")
    assert canonical_name("C") != canonical_name("C++")
    assert canonical_name("SQL") != canonical_name("NoSQL")
    assert len({canonical_name(n) for n in ("AWS", "GCP", "Azure")}) == 3
