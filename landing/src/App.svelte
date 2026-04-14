<script>
  import { onMount } from 'svelte';
  import { initAnimations } from './lib/animations.js';

  let root;

  onMount(() => {
    return initAnimations(root);
  });
</script>

<div bind:this={root}>

<nav>
  <div class="inner">
    <!-- svelte-ignore a11y_invalid_attribute -->
    <a href="#top" class="wordmark">
      FORGE
      <span class="tag">// deliberation engine</span>
    </a>
    <div class="links">
      <a href="#problem">Pain</a>
      <a href="#how">Method</a>
      <a href="#modes">Modes</a>
      <a href="#demos">Exhibit</a>
      <a href="#faq">FAQ</a>
      <a href="https://github.com/SaharBarak/forge" class="ghstar">★ GitHub</a>
    </div>
  </div>
</nav>
<main>

<!-- ══════════════════════════════════════════════════════════════
     HERO — KERNING CITY SIGNBOARD
     ══════════════════════════════════════════════════════════════ -->
<section class="hero scene" data-scene="main-street">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-1-7 fade-in d1">
      <div class="hero-dateline">
        <span>forge v0.1</span>
        <span class="sep">//</span>
        <span>multi-agent deliberation</span>
        <span class="sep">//</span>
        <span>cli-first</span>
        <span class="sep">//</span>
        <span>mit</span>
        <span class="sep">//</span>
        <span class="live">engine live</span>
      </div>

      <div class="signboard fade-in d2">
        <h1>FORGE</h1>
      </div>
    </div>

    <div class="col-8-12 fade-in d3" style="align-self: end; padding-bottom: 6px;">
      <p class="hero-sub">
        Three hours re-prompting one model gets you a <strong>longer draft</strong>,
        not a decision. <strong>Forge</strong> runs five reasoning archetypes —
        <em>skeptic, pragmatist, analyst, advocate, contrarian</em> — through a
        deterministic phase machine until they actually converge on something you can ship.
      </p>
      <div class="hero-phaseline" aria-label="phase machine sequence">
        discovery <span class="sep">→</span> research <span class="sep">→</span> synthesis <span class="sep">→</span> drafting <span class="sep">→</span> verdict
      </div>
      <div class="hero-cta">
        <a href="#install" class="btn btn-primary">$ npm i -g forge-cli</a>
        <a href="https://github.com/SaharBarak/forge" class="btn btn-ghost">★ Star on GitHub</a>
      </div>
    </div>

    <div class="col-full fade-in d4">
      <h2 class="headline">
        <span class="line">You don't need</span>
        <span class="line">a smarter AI.</span>
        <span class="line">You need <span class="five">f</span>ive that disagree.</span>
      </h2>
    </div>

  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     DEMOS — real CLI captures (second section, right after hero)
     ══════════════════════════════════════════════════════════════ -->
<section id="demos" class="scene" data-scene="rooftop">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-1-7">
      <div class="section-head">
        <span class="section-num">§ 02</span>
        <span class="kicker">see it run</span>
      </div>
      <h2 class="display h2-neon">
        Real terminal sessions,<br><em>no fake GUIs.</em>
      </h2>
    </div>
    <div class="col-9-12" style="align-self: end; padding-bottom: 6px;">
      <p class="prose">
        Every screen below is captured from a live <code>forge</code> session. No mocks, no SaaS
        dashboards — just five archetypes burning through a deterministic phase machine in your
        terminal.
      </p>
    </div>

    <div class="col-1-6" style="margin-top: 32px;">
      <div class="demo-frame">
        <img src="../demo/quick-start.gif"
             alt="Forge CLI banner and home screen with the Last Supper art and FORGE wordmark"
             loading="lazy"
             width="1200" height="720">
        <div class="demo-meta">
          <span class="tag">▶ recorded · forge</span>
          <h4>One command. <em>You're in.</em></h4>
          <p>Type <code>forge</code> and the deliberation room is already set up. Past sessions waiting, five archetypes standing by. No login dance, no API-key paperwork — the cold-start is the hot-start.</p>
        </div>
      </div>
    </div>

    <div class="col-7-12" style="margin-top: 32px;">
      <div class="demo-frame">
        <img src="../demo/wizard.gif"
             alt="Forge CLI persona selection wizard"
             loading="lazy"
             width="1200" height="720">
        <div class="demo-meta">
          <span class="tag">▶ recorded · forge start</span>
          <h4>Tell it what you need <em>decided.</em></h4>
          <p>Paste the question. Pick the default council of five — or generate a custom set tuned to this specific call. One question in, one verdict out.</p>
        </div>
      </div>
    </div>

    <div class="col-full" style="margin-top: 36px;">
      <div class="demo-frame">
        <img src="../demo/deliberation.gif"
             alt="Forge live deliberation: skeptic, pragmatist, and analyst debating Forge's biggest UX risk"
             loading="lazy"
             width="1280" height="820">
        <div class="demo-meta">
          <span class="tag">▶ recorded · live deliberation · 110s</span>
          <h4>Three reasoners disagreeing <em>in real time.</em></h4>
          <p>The <span style="color:#ff5454;">skeptic</span> demands evidence.
          The <span style="color:var(--k-neon-lime);">pragmatist</span> forces closure.
          The <span style="color:var(--k-neon-cyan);">analyst</span> traces implications — and
          pauses mid-debate to read your actual source code before arguing further. Watch a real
          decision take shape in under two minutes.</p>
        </div>
      </div>
    </div>

    <div class="col-full" style="margin-top: 36px; text-align: center;">
      <p class="mono" style="color: var(--k-text-dim); font-size: 0.78rem;">
        <span style="color: var(--k-neon-lime); text-shadow: 0 0 6px var(--k-neon-lime);">▶</span>
        Every recording above is a real session. No staged dashboards, no mocked output.
      </p>
    </div>

  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     PROBLEM — pixel speech bubbles
     ══════════════════════════════════════════════════════════════ -->
<section id="problem" class="scene" data-scene="alley">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-1-7">
      <div class="section-head">
        <span class="section-num">§ 03</span>
        <span class="kicker">the actual pain</span>
      </div>
      <h2 class="display h2-neon">
        Open chat with one model<br><em>doesn't ship decisions.</em>
      </h2>
    </div>

    <div class="col-8-12" style="align-self: end;">
      <p class="problem-lede">
        You've spent three hours with Claude on a single architecture call. The doc is longer.
        The verdict is <span class="amber">no closer.</span> You're not stuck because the model
        isn't smart — you're stuck because nothing in the loop is <em>forcing convergence</em>,
        and there's no one in the room willing to disagree with you.
      </p>
    </div>

    <div class="col-1-6">
      <div class="bubble">
        <span class="agent-tag">err · sycophancy_loop</span>
        <h4>Your AI agrees with <em>everything</em>.</h4>
        <p>Single-model sessions become sycophancy spirals. There's no critic, no skeptic, no contrarian — just one model nodding along to whatever you said last. The more you prompt, the more it confirms what you already thought.</p>
      </div>
    </div>

    <div class="col-7-12" style="display: flex; flex-direction: column; gap: 28px;">
      <div class="bubble warn">
        <span class="agent-tag">warn · no_termination</span>
        <h4>Re-prompting is the new <em>doom-scroll</em>.</h4>
        <p>Hours of "make it better," "try again," "go deeper." No structure, no closure — an infinite refinement loop with no termination condition built in.</p>
      </div>
      <div class="bubble fail">
        <span class="agent-tag">fail · no_verdict</span>
        <h4>You walk away with vibes, <em>not a verdict</em>.</h4>
        <p>Open-ended chat has no forcing function. The thread sprawls, the doc bloats, and you're left convinced something in there must be the answer. It isn't.</p>
      </div>
    </div>

  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     HOW IT WORKS
     ══════════════════════════════════════════════════════════════ -->
<section id="how" class="scene" data-scene="subway-platform">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="scene-train" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-1-6">
      <div class="section-head">
        <span class="section-num">§ 04</span>
        <span class="kicker">the method</span>
      </div>
      <h2 class="display h2-neon" style="margin-bottom: 18px;">
        Pick a mode.<br>
        Run the phases.<br>
        Get a <em>verdict.</em>
      </h2>
      <p class="prose">
        Forge orchestrates agents through a deterministic state machine. Each phase enforces its
        own focus, message limits, and loop detection — so deliberations
        <strong>converge instead of spiraling.</strong>
      </p>
    </div>

    <div class="col-7-12">
      <div class="step">
        <div class="step-num">i.</div>
        <div>
          <h4>Pick your mode.</h4>
          <p>Choose from eight deliberation workflows designed for different decision types — or write your own.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">ii.</div>
        <div>
          <h4>Define the question.</h4>
          <p>Set your goal. Select which archetypes participate. Configure round limits to prevent runaway discussion.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">iii.</div>
        <div>
          <h4>Watch structured phases.</h4>
          <p>The session moves automatically through <em>Discovery → Research → Synthesis → Drafting → Verdict</em>. No one gets stuck on framing forever.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">iv.</div>
        <div>
          <h4>Get forced closure.</h4>
          <p>Loop detection and message limits prevent circular debate. Agents are pushed through evidence gathering to consensus.</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num">v.</div>
        <div>
          <h4>Export the result.</h4>
          <p>Full transcript, final draft, per-section decisions. Markdown, JSON, or HTML.</p>
        </div>
      </div>
    </div>

  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     MODES — eight pixel cards
     ══════════════════════════════════════════════════════════════ -->
<section id="modes" class="scene" data-scene="neon-market">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-1-7">
      <div class="section-head">
        <span class="section-num">§ 05</span>
        <span class="kicker">eight modes shipped</span>
      </div>
      <h2 class="display h2-neon">
        Each mode embeds a<br><em>proven decision</em> framework.
      </h2>
    </div>
    <div class="col-9-12" style="align-self: end; padding-bottom: 6px;">
      <p class="prose">
        Modes aren't just prompts — they're full workflows with defined phases, message limits,
        success criteria, and loop detection tuned for that decision type.
      </p>
    </div>

    <div class="col-full" style="margin-top: 28px;">
      <div class="modes-grid">

        <div class="mode">
          <span class="mode-glyph">01</span>
          <div class="mode-id">copywrite</div>
          <h4>Copywriting</h4>
          <p>Create compelling web copy that converts. Agents debate positioning, then draft section-by-section.</p>
          <div class="mode-phases">discovery → research → ideation → synthesis → drafting</div>
        </div>

        <div class="mode">
          <span class="mode-glyph">02</span>
          <div class="mode-id">idea-validation</div>
          <h4>Idea Validation</h4>
          <p>Critically evaluate whether an idea is viable. Ends in a GO / NO-GO / PIVOT verdict with reasoning.</p>
          <div class="mode-phases">understand → research → stress-test → verdict</div>
        </div>

        <div class="mode">
          <span class="mode-glyph">03</span>
          <div class="mode-id">ideation</div>
          <h4>Ideation</h4>
          <p>Scout Reddit, forums, and market gaps for real problems. Outputs a ranked list of ideas with evidence.</p>
          <div class="mode-phases">scout → pattern → ideate → rank</div>
        </div>

        <div class="mode">
          <span class="mode-glyph">04</span>
          <div class="mode-id">will-it-work</div>
          <h4>Will It Work?</h4>
          <p>Reach a definitive YES / NO / MAYBE-IF conclusion. No fence-sitting. No "it depends".</p>
          <div class="mode-phases">define → evidence → debate → verdict</div>
        </div>

        <div class="mode">
          <span class="mode-glyph">05</span>
          <div class="mode-id">site-survey</div>
          <h4>Site Survey &amp; Rewrite</h4>
          <p>Analyze an existing website and produce before/after copy rewrites for every section.</p>
          <div class="mode-phases">analyze → diagnose → research → rewrite</div>
        </div>

        <div class="mode">
          <span class="mode-glyph">06</span>
          <div class="mode-id">business-plan</div>
          <h4>Business Plan</h4>
          <p>Build a structured business plan with problem, market, model, GTM, and an executive summary.</p>
          <div class="mode-phases">problem → market → model → gtm → synthesis</div>
        </div>

        <div class="mode">
          <span class="mode-glyph">07</span>
          <div class="mode-id">gtm-strategy</div>
          <h4>Go-to-Market</h4>
          <p>Launch strategy with ICP, positioning, channels, tactics, and a week-by-week timeline.</p>
          <div class="mode-phases">audience → positioning → channels → tactics</div>
        </div>

        <div class="mode">
          <span class="mode-glyph">08</span>
          <div class="mode-id">custom</div>
          <h4>Custom</h4>
          <p>Define your own phase sequence, agent focus, and success criteria. The engine handles the rest.</p>
          <div class="mode-phases">your phases → your outputs</div>
        </div>

      </div>
    </div>
  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     DEMOS — pixel-rendered gif frames
     ══════════════════════════════════════════════════════════════ -->


<!-- ══════════════════════════════════════════════════════════════
     FEATURES — pixel cards in three columns
     ══════════════════════════════════════════════════════════════ -->
<section id="features" class="scene" data-scene="back-alley">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-full">
      <div class="section-head">
        <span class="section-num">§ 06</span>
        <span class="kicker">what's inside</span>
      </div>
      <h2 class="display h2-neon" style="margin-bottom: 32px;">
        Built for decisions<br><em>that actually ship.</em>
      </h2>
    </div>

    <div class="col-full">
      <div class="feat-double">
        <div class="feat">
          <span class="num">i. the ensemble</span>
          <h4>Multi-archetype deliberation.</h4>
          <p>Five culture-neutral reasoning archetypes — <em>skeptic, pragmatist, analyst, advocate, contrarian</em> — each bringing a distinct stance. No made-up names, no personalities, just roles.</p>
        </div>
        <div class="feat">
          <span class="num">ii. the scribe</span>
          <h4>Grounded in your real code.</h4>
          <p>When the debate needs facts, one of the archetypes pauses to <em>read your actual source files</em> — not a summary, the files — and comes back with citations. Decisions grounded in what you shipped, not what someone remembered.</p>
        </div>
        <div class="feat">
          <span class="num">iii. the machine</span>
          <h4>Every session ends with a verdict.</h4>
          <p>Sessions run through a fixed arc: <em>Discovery → Research → Synthesis → Drafting → Verdict</em>. No spinning forever on framing. No session without an exit door.</p>
        </div>
        <div class="feat">
          <span class="num">iv. the key</span>
          <h4>No new subscription. No new key.</h4>
          <p>If you can already run Claude Code, Forge works. Your existing auth carries through — no paste-in API key, no vendor portal, no extra monthly line item.</p>
        </div>
        <div class="feat">
          <span class="num">v. the bell</span>
          <h4>Circular debate gets interrupted.</h4>
          <p>When agents start repeating themselves, the session notices and forces the next phase. Repeat questions get capped. You always walk away with a result — not a half-finished thread.</p>
        </div>
        <div class="feat">
          <span class="num">vi. the chamber</span>
          <h4>Watch it happen in your terminal.</h4>
          <p>Phases, turns, who's speaking, who's being disputed — all live, in place. No dashboards to open, no browser tabs to juggle, no heavyweight desktop app. Just the deliberation, rendered.</p>
        </div>
      </div>
    </div>

  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     FOR WHOM — speech bubbles
     ══════════════════════════════════════════════════════════════ -->
<section id="forwhom" class="scene" data-scene="band-stage">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-1-7">
      <div class="section-head">
        <span class="section-num">§ 07</span>
        <span class="kicker">who runs forge</span>
      </div>
      <h2 class="display h2-neon">
        Built for the people<br><em>who ship.</em>
      </h2>
    </div>

    <div class="col-full" style="margin-top: 28px;">
      <div class="audience-grid">
        <div class="audience">
          <div class="init">D.</div>
          <h4>Developers.</h4>
          <p>Stop architecture debates that span weeks. Run <code>will-it-work</code> mode to force evidence-based decisions on technical choices. The structured debate phase prevents seniority from overriding evidence.</p>
        </div>
        <div class="audience">
          <div class="init">P.</div>
          <h4>Product Managers.</h4>
          <p>Turn endless product discussions into concrete decisions. Run <code>idea-validation</code> for systematic GO/NO-GO/PIVOT, or <code>copywrite</code> to progress through discovery → drafting instead of cycling feedback.</p>
        </div>
        <div class="audience">
          <div class="init">R.</div>
          <h4>AI Researchers.</h4>
          <p>Study structured multi-agent deliberation in a real, running system. Every turn, phase transition, and consensus point is logged and replayable — not hidden behind a black-box API you can't inspect.</p>
        </div>
      </div>
    </div>
  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     OPEN SOURCE
     ══════════════════════════════════════════════════════════════ -->
<section id="oss">
  <div class="grid">
    <div class="col-full" style="text-align: center;">
      <div class="section-head" style="justify-content: center;">
        <span class="kicker">open source · no chains</span>
      </div>
      <h2 class="display h2-neon">
        MIT licensed.<br><em>No vendor dependencies.</em>
      </h2>
    </div>

    <div class="col-2-11" style="margin-top: 26px;">
      <p class="oss-manifesto">
        Forge runs <strong>locally, on your machine, against your data</strong>. Most decision tools
        lock you into a SaaS subscription — Forge doesn't even want your email. The whole engine lives
        in a single open repo you can read, fork, or rewrite. Every mode, every archetype, every phase
        rule is <strong>inspectable and forkable</strong>. No permission required.
      </p>

      <p class="oss-meta">
        <strong>MIT</strong> · <strong>Terminal-native</strong> · <strong>Zero API-key lock-in</strong> · <strong>Local by default</strong> · <strong>Fork friendly</strong>
      </p>
    </div>
  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     FAQ
     ══════════════════════════════════════════════════════════════ -->
<section id="faq" class="scene" data-scene="subway-car">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--near" aria-hidden="true"></div>
  <div class="scene-window-city" aria-hidden="true"></div>
  <div class="grid">

    <div class="col-1-6">
      <div class="section-head">
        <span class="section-num">§ 08</span>
        <span class="kicker">frequently asked</span>
      </div>
      <h2 class="display h2-neon">
        Stuff people ask<br><em>first.</em>
      </h2>
      <p class="prose" style="max-width: 36ch; margin-top: 16px;">
        If it's not answered here, the answer is probably in the <a href="https://github.com/SaharBarak/forge" style="color: var(--k-neon-cyan); text-decoration: underline;">repo</a>.
        Otherwise open an issue — we read them.
      </p>
    </div>

    <div class="col-7-12">
      <div class="faq">
        <details>
          <summary>How is this different from Claude or GPT directly?</summary>
          <p class="answer">
            A single model agrees with whatever you said last. Forge runs <em>five archetypes who don't</em>
            through a fixed workflow — <strong>Will It Work</strong>
            (<code>define → evidence → debate → verdict</code>), <strong>Copywriting</strong>
            (<code>discovery → research → ideation → synthesis → drafting</code>), or any of six others.
            You don't get a nicer draft — you get a real decision, with the disagreement visible and the
            verdict attributable.
          </p>
        </details>
        <details>
          <summary>Do I need an API key?</summary>
          <p class="answer">
            No. If you can already run <code>claude</code> in your terminal, Forge works — your existing
            Claude Code auth carries through. No pasted API key, no new vendor portal, no extra monthly
            bill. Your session is your session.
          </p>
        </details>
        <details>
          <summary>Is the debate deterministic?</summary>
          <p class="answer">
            The <em>structure</em> is deterministic — phases run in order, message limits are enforced,
            and research requests are serialized. The <em>content</em> of each turn is not: different
            runs will surface different evidence and arguments, but the shape of the deliberation is
            always the same.
          </p>
        </details>
        <details>
          <summary>Can I use my own models?</summary>
          <p class="answer">
            Yes. The agent runner is a swappable interface — Claude Code is the default, but you can
            wire in GPT, Gemini, a local Llama, or anything else that can answer a prompt. The
            deliberation engine doesn't care which model is behind each archetype.
          </p>
        </details>
        <details>
          <summary>How do I extend it with new modes?</summary>
          <p class="answer">
            Every mode is a small config object: phase sequence, per-phase focus, success criteria,
            required sections. Copy an existing one, change the shape, register it, and it shows up in
            the CLI — no changes to the core engine. Custom modes ship alongside the built-in eight.
          </p>
        </details>
      </div>
    </div>

  </div>
</section>


<!-- ══════════════════════════════════════════════════════════════
     FINAL CTA — under the signboard
     ══════════════════════════════════════════════════════════════ -->
<section class="final scene" id="install" data-scene="signboard-closeup">
  <div class="scene-bg scene-bg--far" aria-hidden="true"></div>
  <div class="scene-bg scene-bg--mid" aria-hidden="true"></div>
  <div class="grid">
    <div class="col-full">
      <h2>
        Stop <em>talking.</em><br>
        Start <em>deciding.</em>
      </h2>
      <p>
        Download Forge CLI and turn your next decision into a structured workflow instead of another endless meeting.
      </p>
      <div class="hero-cta">
        <a href="https://github.com/SaharBarak/forge" class="btn btn-primary">Get Forge on GitHub →</a>
        <a href="#modes" class="btn btn-ghost">Browse Modes</a>
      </div>
    </div>
  </div>
</section>

</main>
<footer>
  <div class="colophon">
    <div class="colophon-mark">FORGE</div>
    <div class="colophon-tag">— multi-agent deliberation engine —</div>

    <p class="colophon-text">
      Built for decisions that ship. No tracking scripts, no analytics, no SaaS subscriptions — and no
      onboarding flow asking for your email. Open source, local first, yours to fork.
    </p>

    <div class="colophon-links">
      <a href="https://github.com/SaharBarak/forge">GitHub</a>
      <a href="https://github.com/SaharBarak/forge/issues">Issues</a>
      <a href="https://github.com/SaharBarak/forge/blob/main/LICENSE">MIT License</a>
      <a href="#how">Method</a>
      <a href="#modes">Modes</a>
      <a href="#faq">FAQ</a>
    </div>

    <div class="colophon-stamp">
      <em>MIT © SaharBarak</em> · 2026 · local-first · fork-friendly
    </div>
  </div>
</footer>

</div>
