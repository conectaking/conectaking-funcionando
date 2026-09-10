<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * Cache leve de Schema::hasTable/hasColumn (introspection cara em VPS pequena).
 */
final class SchemaMeta
{
    /** @var array<string, bool> */
    private static array $memo = [];

    public static function hasTable(string $table): bool
    {
        $key = 't:'.$table;
        if (array_key_exists($key, self::$memo)) {
            return self::$memo[$key];
        }
        try {
            $ok = (bool) Cache::remember('schema_meta:table:'.$table, 3600, static fn () => Schema::hasTable($table));
        } catch (\Throwable) {
            $ok = Schema::hasTable($table);
        }

        return self::$memo[$key] = $ok;
    }

    public static function hasColumn(string $table, string $column): bool
    {
        $key = 'c:'.$table.'.'.$column;
        if (array_key_exists($key, self::$memo)) {
            return self::$memo[$key];
        }
        try {
            $ok = (bool) Cache::remember(
                'schema_meta:col:'.$table.'.'.$column,
                3600,
                static fn () => Schema::hasColumn($table, $column)
            );
        } catch (\Throwable) {
            $ok = Schema::hasColumn($table, $column);
        }

        return self::$memo[$key] = $ok;
    }
}
