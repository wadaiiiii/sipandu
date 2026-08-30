<?php

namespace App\Services\Classroom;

use App\Models\CourseClass;

class ClassJoinCodeService
{
    public function for(CourseClass $courseClass): string
    {
        $custom = $this->normalize((string) $courseClass->getAttribute('join_code'));
        if ($custom !== '') {
            return $custom;
        }

        return $this->forId((int) $courseClass->getKey());
    }

    public function resolve(string $code): ?CourseClass
    {
        $normalized = $this->normalize($code);
        if ($normalized === '') {
            return null;
        }

        $custom = CourseClass::query()
            ->whereRaw('UPPER(join_code) = ?', [$normalized])
            ->first();
        if ($custom) {
            return $custom;
        }

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

        return hash_equals($this->forId((int) $courseClass->getKey()), $normalized) ? $courseClass : null;
    }

    public function normalize(string $code): string
    {
        return strtoupper((string) preg_replace('/\s+/', '-', trim($code)));
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
