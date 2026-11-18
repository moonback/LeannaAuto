import {describe,it,expect} from "vitest";
import {checkAction} from "../src/constitution.js";
describe("constitution tool gate",()=>{
 it("allows shell tool generally",()=>expect(checkAction("shell",{command:"ls"}).allowed).toBe(true));
 it("blocks privileged commands",()=>expect(checkAction("shell",{command:"sudo rm -rf /"}).allowed).toBe(false));
 it("blocks unknown tools",()=>expect(checkAction("network_scan",{}).allowed).toBe(false));
 it("blocks docker privileged flag",()=>expect(checkAction("shell",{command:"docker run --privileged alpine"}).allowed).toBe(false));
 it("blocks reboot and filesystem formatting",()=>{
  expect(checkAction("shell",{command:"reboot"}).allowed).toBe(false);
  expect(checkAction("shell",{command:"mkfs.ext4 /dev/sda"}).allowed).toBe(false);
 });
});
