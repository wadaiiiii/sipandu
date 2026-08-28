<?php

namespace App\Services\Classroom;

use App\Models\CourseClass;

class ClassJoinCodeService
{
    public function for(CourseClass $courseClass): string
    {
        return $this->forId((int) $courseClass->getKey());
    }

    public function resolve(string $code): ?CourseClass
    {
        $normalized = strtoupper((string) preg_replace('/\s+/', '', trim($code)));

        if (! preg_match('/^K([A-Z0-9]+)-([A-F0-9]{8})$/', $normalized, $matches)) {
            return null;
        }

        $id = (int) base_convert($matches[1], 36, 10);
        if ($id < 1) {
            return null;
        }

        $courseClass = CourseClass::query()->find($id);
        if (! $courseClass) {
            return null;
        }

        return hash_equals($this->for($courseClass), $normalized) ? $courseClass : null;
    }

    private function forId(int $id): string
    {
        $encodedId = strtoupper(base_convert((string) $id, 10, 36));
        $signature = strtoupper(substr(hash_hmac('sha256', "sipandu-class:{$id}", $this->secret()), 0, 8));

        return "K{$encodedId}-{$signature}";
    }

    private function secret(): string
    {
        return (string) config('app.key', 'sipandu-local-class-code');
    }
}
