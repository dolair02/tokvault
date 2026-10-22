from pathlib import Path
import shutil
p=Path('/Users/dolairm5/.gemini/antigravity/scratch/tokvault/src/App.tsx');s=p.read_text();shutil.copy2(p,'work/TokVault-App-before-bottom-nav.tsx')
s=s.replace('  Video\n','  Video,\n  Clock,\n  Settings\n')
s=s.replace('  const fileInputRef =',"  const [showSettings, setShowSettings] = useState(false);\n\n  const fileInputRef =")
a=s.index('              <button',s.index('{/* Mobile Horizontal Collection Pills */}'));b=s.index('              {collections.map((c) => (',a)
s=s[:a]+s[b:];i=s.index('{/* Mobile Horizontal Collection Pills */}');j=s.index('{/* Popular Tags Bar */}',i);block=s[i:j].replace('collections.map((c)',"collections.filter((c) => c.id !== 'watch-later').map((c)").replace('onClick={() => setActiveFilter(c.id)}',"onClick={() => { setActiveFilter(c.id); setActiveTag(null); setShowSettings(false); }}")
s=s[:i]+block+s[j:]
s=s.replace('pb-20 md:pb-8','pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-8')
mark='      {/* MODAL 1: IN-APP TIKTOK VIDEO PLAYER */}'
nav='''      <nav aria-label="Library navigation" className="fixed bottom-0 inset-x-0 z-40 md:hidden grid grid-cols-4 border-t border-[#2B3042] bg-[#101218] shadow-[0_-4px_20px_rgba(0,0,0,0.25)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[
          { id: 'all', label: 'All', icon: Video },
          { id: 'favorites', label: 'Favorites', icon: Heart },
          { id: 'watch-later', label: 'Watch Later', icon: Clock },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(({ id, label, icon: Icon }) => {
          const selected = id === 'settings' ? showSettings : !showSettings && activeFilter === id;
          return <button key={id} type="button" aria-current={selected ? 'page' : undefined}
            onClick={() => { setShowSettings(id === 'settings'); if (id !== 'settings') { setActiveFilter(id); setActiveTag(null); setSearchQuery(''); } }}
            className={`min-h-[72px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${selected ? 'text-[#25F4EE] bg-[#25F4EE]/5' : 'text-slate-400'}`}>
            <Icon className="w-5 h-5" /><span>{label}</span>
          </button>;
        })}
      </nav>

      {showSettings && (
        <section aria-label="Settings" className="fixed inset-x-0 top-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 overflow-y-auto bg-[#0B0C10] px-5 pt-8 md:inset-0 md:z-50 md:max-w-lg md:m-auto md:h-fit md:rounded-2xl md:border md:border-[#252836] md:p-6">
          <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">Settings</h2><button aria-label="Close settings" onClick={() => setShowSettings(false)} className="p-3"><X className="w-5 h-5" /></button></div>
          <p className="text-sm text-slate-400 mb-6">Manage your library and collections.</p>
          <div className="space-y-3">
            <button onClick={() => setShowBackupModal(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><Download className="w-5 h-5 text-[#25F4EE]" />Backup & Restore</button>
            <button onClick={() => setShowMobileGuideModal(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><Smartphone className="w-5 h-5 text-[#25F4EE]" />Add to Home Screen</button>
            <button onClick={() => setShowNewFolderModal(true)} className="w-full p-4 rounded-xl bg-[#181B24] text-left flex gap-3"><FolderPlus className="w-5 h-5 text-[#25F4EE]" />New Collection</button>
          </div>
          <p className="text-xs text-slate-500 mt-8">TokVault · {items.length} saved links · Stored on this device</p>
        </section>
      )}

'''
s=s.replace(mark,nav+mark);p.write_text(s)
