<?php

namespace Tests\Feature;

use App\Http\Middleware\PrefixSubdirectoryHtmlUrls;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class SubdirectoryHostingTest extends TestCase
{
    public function test_runtime_bridge_and_pwa_assets_use_configured_base_path(): void
    {
        config()->set('sipandu.base_path', '/akademik/sipandu');

        $bridge = view('partials.api-prefix-bridge')->render();
        $pwaHead = view('partials.pwa-head')->render();

        $this->assertStringContainsString('name="app-base-path" content="/akademik/sipandu"', $bridge);
        $this->assertStringContainsString('/sipandu-api/', $bridge);
        $this->assertStringContainsString("value.startsWith('/akademik/')", $bridge);
        $this->assertStringContainsString('href="/akademik/sipandu/manifest.webmanifest"', $pwaHead);
        $this->assertStringContainsString('href="/akademik/sipandu/icons/sipandu-icon.svg"', $pwaHead);
        $this->assertStringContainsString('href="/akademik/sipandu/icons/sipandu-192.png"', $pwaHead);
    }

    public function test_static_html_root_urls_are_prefixed_without_double_prefixing_or_touching_sibling_apps(): void
    {
        config()->set('sipandu.base_path', '/akademik/sipandu');
        $middleware = app(PrefixSubdirectoryHtmlUrls::class);
        $request = Request::create('/kelas/7', 'GET');

        $response = $middleware->handle($request, fn () => new Response(
            '<a href="/kelas/7">Kelas</a><form action="/logout"></form><img src="/akademik/sipandu/icons/sipandu-icon.svg"><a href="/akademik/simatrps">SiMatRPS</a>',
            200,
            ['Content-Type' => 'text/html; charset=UTF-8'],
        ));

        $html = (string) $response->getContent();
        $this->assertStringContainsString('href="/akademik/sipandu/kelas/7"', $html);
        $this->assertStringContainsString('action="/akademik/sipandu/logout"', $html);
        $this->assertSame(1, substr_count($html, '/akademik/sipandu/icons/sipandu-icon.svg'));
        $this->assertStringContainsString('href="/akademik/simatrps"', $html);
        $this->assertStringNotContainsString('/akademik/sipandu/akademik/simatrps', $html);
    }

    public function test_sso_callback_can_be_derived_from_app_url_with_subdirectory(): void
    {
        $root = 'https://matematika.unsulbar.ac.id/akademik/sipandu';
        config()->set('app.url', $root);
        config()->set('services.simatrps.sso_redirect_uri', null);
        URL::forceRootUrl($root);
        URL::forceScheme('https');

        $this->assertSame($root.'/sso/callback', route('sso.callback'));
        $this->assertSame($root.'/sso/start', route('sso.start'));
    }

    public function test_manifest_uses_relative_scope_for_root_or_subdirectory_installation(): void
    {
        $manifest = json_decode((string) file_get_contents(public_path('manifest.webmanifest')), true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame('./', $manifest['id']);
        $this->assertSame('./', $manifest['start_url']);
        $this->assertSame('./', $manifest['scope']);
        $this->assertSame('icons/sipandu-192.png', $manifest['icons'][0]['src']);
    }
}
