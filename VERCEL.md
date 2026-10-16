# Vercel + Supabase 部署

## 1. 创建存储

在 https://supabase.com/dashboard 登录并创建项目，名称可用 `guguland`。妥善保管数据库密码，不需要写到代码里。项目准备好后打开 SQL Editor，粘贴本仓库 `supabase/setup.sql` 全部内容并 Run。

脚本创建受保护的记录表和私有 `gugu-media` 存储桶。不需要放开表的 RLS 或把桶设为公开。

## 2. 导入 Vercel

在 https://vercel.com/new 导入 `hhaaapppyy/guguland`。

- Project Name：`guguland`
- Root Directory：`./`
- Application Preset：`Other`
- Build Command：`node build-vercel.mjs`
- Output Directory：`public`
- Install Command：保持默认

仓库中的 `vercel.json` 已设置构建命令和输出目录。若页面覆盖这些设置，请按上述值填写。

在 Environment Variables 中设置：

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目网址，形如 `https://项目编号.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 项目 API Keys 中的服务端 `service_role` 密钥，不能用 anon/publishable key |
| `SETUP_KEY` | 自己生成并保存的一串长随机字符，建议至少 32 位字母数字 |

这些值仅在服务器使用，不加 NEXT_PUBLIC 前缀，不放进 GitHub，不发送截图泄露。

点击 Deploy。环境变量后续修改后需要重新部署。首次部署可先不填变量查看房间，投递会提示未连接；这不代表投递功能上线完成。

## 3. 初始化投递密码

部署成功后，访问 `https://实际域名/deliver#setup=你设置的SETUP_KEY`，设置至少 12 位投递密码。

这个初始化网址只留给自己。以后直接打开 `/deliver` 登录。给对方分享网站首页，不分享初始化网址或投递密码。

## 4. 实际验收

用手机流量打开首页；在投递口放一张纸条和一张照片；再用另一设备打开首页检查内容。上传对应歌曲音频后点播，验证播放和暂停。网站默认不自动播放。

大陆网络是否能正常访问需要实际测试；部署成功不代表所有运营商都能稳定打开。自定义域名可之后再配置。

## 限制与维护

单文件最大 12 MB。文件通过临时上传地址直传私有存储，播放时使用临时读取地址。上传中断可能留下 `pending/` 临时文件，可在 Supabase Storage 中清理；不要删除 `media/` 中仍在使用的文件。免费服务的额度、闲置暂停及续费条件以平台当前规则为准。

本仓库未包含私人数据。上线后房间对能访问链接的人可见；投递需要密码。房间布置、笔记本和个人相框仍保存在各自设备中。
