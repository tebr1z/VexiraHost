import {
  extractXmlTag,
  parseDiskUsageBlock,
  parsePleskStatus,
  sumDiskUsage,
} from "./plesk-xml.util";

describe("plesk-xml.util", () => {
  it("parses gen_info fields from webspace response", () => {
    const xml = `
      <result>
        <status>ok</status>
        <id>2435</id>
        <data>
          <gen_info>
            <name>example.com</name>
            <status>0</status>
            <real_size>2097152</real_size>
            <htype>vrt_hst</htype>
          </gen_info>
          <limits>
            <disk_space>10737418240</disk_space>
            <max_traffic>107374182400</max_traffic>
          </limits>
        </data>
      </result>`;

    const genInfo = `<gen_info><name>example.com</name><status>0</status><real_size>2097152</real_size></gen_info>`;
    expect(extractXmlTag(genInfo, "name")).toBe("example.com");
    expect(parsePleskStatus(extractXmlTag(genInfo, "status"))).toBe("active");
    expect(extractXmlTag(xml, "disk_space")).toBe("10737418240");
  });

  it("parses disk_usage breakdown", () => {
    const block = `<httpdocs>2097152</httpdocs><mailboxes>12582978</mailboxes>`;
    const usage = parseDiskUsageBlock(block);
    expect(usage.httpdocs).toBe(2097152);
    expect(sumDiskUsage(usage)).toBe(14680130);
  });
});
