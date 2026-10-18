# Auto Deploy resurs limitləri

Bu dəyişiklik lokal layihədə hazırlandı; Windows üzərindəki unit testlər real Linux cgroup, XFS kvota və yük testini əvəz etmir. Real serverdə quraşdırma və təhlükəsizlik sınağı hələ aparılmayıb.

## Hazırlanan hissələr

- Hər hosting planında `autoDeployCpuPercent`, `autoDeployMemoryMb`, ayrıca SSD və tətbiq sayı limitləri var. `100% CPU` bir nüvənin vaxtıdır. CPU/RAM limitləri ayrıca tətbiqə deyil, həmin hosting hesabının bütün tətbiq və build proseslərinə ortaqdır.
- Next.js / NestJS build-ləri imtiyazsız istifadəçi ilə məhdud systemd servislərində işləyir. PM2 runtime daimi systemd servisi daxilindədir və reboot üçün enable olunur. Host fayl sistemi read-only, yalnız hesabın iş sahəsi writable, `/tmp` ayrıca 64 MB tmpfs-dir. Bu tmpfs RAM limitinə daxildir.
- .NET Docker image ilə yerləşdirilir. Konteyner tenant UID/GID-si, read-only root, capabilities olmadan, no-new-privileges və məhdud PID/RAM/CPU ilə işləyir. Yazılan məlumat `/data` bind mount-unda saxlanılır. Eyni hesabın konteynerləri və PM2 servisləri eyni parent cgroup-a bağlanır.
- XFS project və user hard kvotaları birlikdə tələb olunur. User kvotası müştərinin öz fayllarında project ID dəyişərək limitdən qaçmasının qarşısını almaq üçündür. 200000 inode limiti çoxsaylı kiçik fayl hücumlarını məhdudlaşdırır. Kvota yoxdursa deploy dayandırılır; sadəcə xəbərdarlıq edib davam etmir.
- Bütün tenantlar üçün parent cgroup server RAM və CPU-sunun maksimum 80%-ni istifadə edir. Bu, OS/Plesk üçün ehtiyatdır, müştərilərə ayrılmış fiziki resurs rezervasiyası deyil. Həddindən çox RAM satılarsa parent cgroup-da OOM yenə mümkündür; server tutumu ayrıca planlaşdırılmalıdır.
- Müştəri öz resurslarını, admin seçilmiş hesabın resurslarını görə bilir. 30 saniyəlik UI yenilənməsi və 15 saniyəlik backend keş var. CPU iki monotonic ölçmə ilə hesablanır. Alınmayan ölçmə sıfır kimi göstərilmir. Panel seçilmiş və tətbiq edilmiş limitin fərqini göstərir.
- Yeni limit növbəti deploy/restart zamanı həmin hesabın node-unda tətbiq edilir. Köhnə, izolyasiyasız tətbiqlər avtomatik təhlükəsiz hesab edilmir: onları yenidən deploy etmək lazımdır. Tətbiqlər bir runtime node-da saxlanılmalıdır; node dəyişəndə köhnə tətbiqlərin miqrasiyası tələb olunur.
- Əvvəldən mövcud, qeydiyyatsız Linux istifadəçisi başqa home-a bağlıdırsa avtomatik mənimsənilmir. Administrator köhnə faylları/PM2 proseslərini yoxlayıb bu UID-nin yalnız həmin hesaba aid olduğunu təsdiqlədikdən sonra miqrasiya etməlidir. UID və project ID toqquşması deploy-u dayandırır.

## Real server üçün lazım olanlar

1. Ayrı Linux Auto Deploy node-u; Ubuntu 22.04+ və ya AlmaLinux 9 kimi systemd/cgroup v2 dəstəyi olan sistem. Windows Plesk serveri runtime kimi uyğun deyil; Plesk proxy başqa serverdə ola bilər.
2. Root SSH məlumatları admin formasında; çata yazılmamalıdır. Node.js 22+, npm, PM2, Git, unzip, xfsprogs və util-linux.
3. Deploy base path üçün XFS disk, **user və project quota enforcement** (`uquota,prjquota`). Kod disk formatlamır, fstab yazmır, remount etmir. Bunu server administratoru hazırlamalıdır. Mövcud ext4 disk üzərində dəyişiklik etmədən yeni XFS volume/node seçilə bilər.
4. .NET üçün Docker Engine + systemd cgroup driver və Compose. App root olaraq işləməyi və image root filesystem-inə yazmağı tələb etməməlidir; `/data` və `/tmp` istifadə olunmalıdır.
5. Node-da RAM, CPU nüvələri, SSD həcmi, IOPS, müştəri sayı və gözlənilən build paralelliyi məlum olmalıdır. Böyük Next.js build-ləri 1 GB-dan çox RAM tələb edə bilər; limit aşılarsa build dayanır.

## Canlı istifadədən əvvəl tamamlanmalı yoxlamalar

- Bu, VM və ya microVM izolyasiyası deyil; tenantlar host kernel-ini paylaşır. Xüsusilə düşmən kod yerləşdirilən açıq hosting üçün ayrıca worker VM/microVM təhlükəsizlik sərhədi nəzərdən keçirilməlidir.
- Tenant şəbəkə izolyasiyası, private IP/metadata/local service çıxışına nəzarət və proxy-node firewall qaydaları hələ hazırlanmalıdır. Read-only mount UNIX socket-lərə və şəbəkəyə girişi öz-özünə bloklamır. Təkcə bu dəyişiklik əsasında sistemi düşmən kod üçün production-ready elan etmək olmaz.
- Real Linux üzərində CPU stress, RAM OOM, disk/inode overflow, fork bomb, başqa tenant fayllarına giriş, reboot və redeploy sınaqları aparılmalıdır. Server backup-u və bərpa sınağı olmalıdır.
- Shared Docker image-ləri, Docker daemon logları, backend upload staging və host sistem faylları tenant SSD kvotasından kənardadır. Image registry/download siyasəti, staging limiti/təmizliyi, host disk ehtiyatı və log retention ayrıca tənzimlənməlidir.
- Queue hazırda backend prosesinin yaddaşındadır; çox worker üçün davamlı queue və server üzrə distributed lock tələb olunur. Bu dəyişiklik yüksək yükə dair benchmark və ya SLA zəmanəti vermir.

Mənbələr: [systemd resurs nəzarəti](https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html), [systemd sandbox məhdudiyyətləri](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html), [Docker resurs limitləri](https://docs.docker.com/engine/containers/resource_constraints/), [Linux quota ID yoxlaması](https://github.com/torvalds/linux/blob/v6.6/fs/ioctl.c).
